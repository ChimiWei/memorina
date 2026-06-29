package images

import (
	"bytes"
	"encoding/json"
	"fmt"
	"image"
	_ "image/gif"
	"image/jpeg"
	_ "image/png"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"memorina-backend/internal/auth"
	"memorina-backend/internal/database"

	"golang.org/x/image/draw"
)

const (
	maxUploadSize = 10 << 20 // 10 MB
	maxDimension  = 800      // max width or height in pixels
	jpegQuality   = 85       // JPEG output quality (0-100)
)

var Storage *GarageStorage

// UploadHandler handles POST /images
// Receives a multipart form with a "file" field, compresses and stores it in Garage.
func UploadHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Limit request body size
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		http.Error(w, "File too large (max 10MB)", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Missing file field", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate MIME type
	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		http.Error(w, "Only image files are allowed", http.StatusBadRequest)
		return
	}

	// Decode the image
	src, _, err := image.Decode(file)
	if err != nil {
		http.Error(w, "Invalid image file", http.StatusBadRequest)
		return
	}

	// Resize if necessary
	processed := resizeIfNeeded(src, maxDimension)

	// Encode to JPEG for consistent output and good compression
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, processed, &jpeg.Options{Quality: jpegQuality}); err != nil {
		log.Printf("[Upload] JPEG encode error: %v\n", err)
		http.Error(w, "Failed to process image", http.StatusInternalServerError)
		return
	}

	// Generate unique stored filename inside a user-specific folder
	storedFilename := fmt.Sprintf("user_%d/%d.jpg", userID, time.Now().UnixNano())

	// Upload to Garage
	if err := Storage.Upload(r.Context(), storedFilename, &buf, int64(buf.Len()), "image/jpeg"); err != nil {
		log.Printf("[Upload] Garage upload error: %v\n", err)
		http.Error(w, "Failed to save file", http.StatusInternalServerError)
		return
	}

	// Save metadata to DB
	fileSize := buf.Len()
	query := `INSERT INTO images (user_id, original_filename, stored_filename, file_size) VALUES (?, ?, ?, ?)`
	result, err := database.DB.Exec(query, userID, header.Filename, storedFilename, fileSize)
	if err != nil {
		log.Printf("[Upload] DB insert error: %v\n", err)
		// Clean up the Garage object since DB insert failed
		_ = Storage.Delete(r.Context(), storedFilename)
		http.Error(w, "Failed to save image metadata", http.StatusInternalServerError)
		return
	}

	imageID, _ := result.LastInsertId()

	// Generate presigned URL for the response
	url, err := Storage.GetURL(r.Context(), storedFilename)
	if err != nil {
		log.Printf("[Upload] Presigned URL error: %v\n", err)
		// Not fatal — the image was saved, just return empty URL
		url = ""
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(Image{
		ID:               int(imageID),
		UserID:           userID,
		OriginalFilename: header.Filename,
		StoredFilename:   storedFilename,
		URL:              url,
		FileSize:         fileSize,
		CreatedAt:        time.Now(),
	})
}

// ListHandler handles GET /images
// Returns all images belonging to the authenticated user with presigned Garage URLs.
func ListHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	query := `SELECT id, user_id, original_filename, stored_filename, file_size, created_at FROM images WHERE user_id = ? ORDER BY created_at DESC`
	rows, err := database.DB.Query(query, userID)
	if err != nil {
		log.Printf("[ListImages] DB query error: %v\n", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var imgs []Image
	for rows.Next() {
		var img Image
		if err := rows.Scan(&img.ID, &img.UserID, &img.OriginalFilename, &img.StoredFilename, &img.FileSize, &img.CreatedAt); err != nil {
			log.Printf("[ListImages] Row scan error: %v\n", err)
			continue
		}
		// Generate a presigned URL for each image
		url, err := Storage.GetURL(r.Context(), img.StoredFilename)
		if err != nil {
			log.Printf("[ListImages] Presigned URL error for %q: %v\n", img.StoredFilename, err)
			continue
		}
		img.URL = url
		imgs = append(imgs, img)
	}

	if imgs == nil {
		imgs = []Image{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(imgs)
}

// DeleteHandler handles DELETE /images/{id}
// Deletes an image from Garage and the database.
func DeleteHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Extract ID from the URL path: /images/{id}
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 2 {
		http.Error(w, "Missing image ID", http.StatusBadRequest)
		return
	}
	idStr := pathParts[len(pathParts)-1]
	imageID, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid image ID", http.StatusBadRequest)
		return
	}

	// Fetch the image to ensure it belongs to this user
	var storedFilename string
	fetchQuery := `SELECT stored_filename FROM images WHERE id = ? AND user_id = ?`
	err = database.DB.QueryRow(fetchQuery, imageID, userID).Scan(&storedFilename)
	if err != nil {
		http.Error(w, "Image not found", http.StatusNotFound)
		return
	}

	// Delete from Garage
	if err := Storage.Delete(r.Context(), storedFilename); err != nil {
		log.Printf("[DeleteImage] Garage delete error: %v\n", err)
		// Continue to delete DB record even if object removal fails
	}

	// Delete from DB
	_, err = database.DB.Exec(`DELETE FROM images WHERE id = ? AND user_id = ?`, imageID, userID)
	if err != nil {
		log.Printf("[DeleteImage] DB delete error: %v\n", err)
		http.Error(w, "Failed to delete image", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Image deleted"})
}

// resizeIfNeeded scales the image down so that neither dimension exceeds maxDim.
func resizeIfNeeded(src image.Image, maxDim int) image.Image {
	bounds := src.Bounds()
	w := bounds.Dx()
	h := bounds.Dy()

	if w <= maxDim && h <= maxDim {
		return src
	}

	var newW, newH int
	if w > h {
		newW = maxDim
		newH = int(float64(h) * float64(maxDim) / float64(w))
	} else {
		newH = maxDim
		newW = int(float64(w) * float64(maxDim) / float64(h))
	}

	dst := image.NewRGBA(image.Rect(0, 0, newW, newH))
	draw.CatmullRom.Scale(dst, dst.Bounds(), src, bounds, draw.Over, nil)
	return dst
}
