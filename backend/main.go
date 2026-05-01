package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"memorina-backend/internal/auth"
	"memorina-backend/internal/database"
	"memorina-backend/internal/images"

	"github.com/joho/godotenv"
)

func pingHandler(w http.ResponseWriter, r *http.Request) {
	var arr = []string{"ping", "pong"}
	var ping string = strings.Join(arr, ", ")
	fmt.Fprintf(w, ping)
}

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on environment variables")
	}

	// Initialize database
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")
	
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true", dbUser, dbPassword, dbHost, dbPort, dbName)

	if err := database.InitDB(dsn); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Initialize MinIO storage
	minioEndpoint := os.Getenv("MINIO_HOST")
	minioAccessKey := os.Getenv("MINIO_USER")
	minioSecretKey := os.Getenv("MINIO_PASSWORD")
	minioBucket := os.Getenv("MINIO_BUCKET")
	minioUseSSL := os.Getenv("MINIO_USE_SSL") == "true"

	if minioEndpoint == "" || minioAccessKey == "" || minioSecretKey == "" {
		log.Fatal("MinIO configuration is incomplete. Set MINIO_HOST, MINIO_USER, and MINIO_PASSWORD.")
	}
	if minioBucket == "" {
		minioBucket = "memorina"
	}

	storage, err := images.NewMinIOStorage(minioEndpoint, minioAccessKey, minioSecretKey, minioBucket, minioUseSSL)
	if err != nil {
		log.Fatalf("Failed to initialize MinIO storage: %v", err)
	}
	images.Storage = storage
	fmt.Printf("MinIO connected: %s (bucket: %s)\n", minioEndpoint, minioBucket)

	// Define Routes using Go 1.22+ method matching
	http.HandleFunc("GET /ping", pingHandler)
	http.HandleFunc("POST /register", auth.RegisterHandler)
	http.HandleFunc("POST /login", auth.LoginHandler)
	http.HandleFunc("POST /login/provider", auth.ProviderLoginHandler)
	http.HandleFunc("POST /logout", auth.LogoutHandler)

	http.HandleFunc("GET /user/config", auth.AuthMiddleware(auth.GetConfigHandler))
	http.HandleFunc("POST /user/config", auth.AuthMiddleware(auth.SaveConfigHandler))

	// Image routes (all authenticated)
	http.HandleFunc("POST /images", auth.AuthMiddleware(images.UploadHandler))
	http.HandleFunc("GET /images", auth.AuthMiddleware(images.ListHandler))
	http.HandleFunc("DELETE /images/", auth.AuthMiddleware(images.DeleteHandler))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	addr := ":" + port
	fmt.Printf("Server starting on port %s...\n", port)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
