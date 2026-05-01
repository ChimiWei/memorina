package auth

import (
	"database/sql"
	"encoding/json"
	"memorina-backend/internal/database"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"log"
)

func generateToken(userID int) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "fallback_secret"
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(time.Hour * 24).Unix(),
	})

	return token.SignedString([]byte(secret))
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" || req.Name == "" {
		http.Error(w, "Fields cannot be empty", http.StatusBadRequest)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	var newID int64
	query := `INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)`
	res, err := database.DB.Exec(query, req.Email, string(hashedPassword), req.Name)
	if err != nil {
		log.Printf("[Register] Failed to create user: %v\n", err)
		http.Error(w, "Failed to create user perhaps email already exists", http.StatusConflict)
		return
	}

	newID, _ = res.LastInsertId()

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "User registered successfully",
		"user": map[string]interface{}{
			"id": newID,
			"email": req.Email,
			"name": req.Name,
		},
	})
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	var user User
	query := `SELECT id, email, password_hash, name FROM users WHERE email = ?`
	err := database.DB.QueryRow(query, req.Email).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("[Login] No user found for email: %s\n", req.Email)
			http.Error(w, "Invalid credentials.", http.StatusUnauthorized)
			return
		}
		log.Printf("[Login] DB error filtering email %s: %v\n", req.Email, err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// For users joined via Providers, PasswordHash will be nil
	if user.PasswordHash == nil {
		http.Error(w, "Invalid credentials.", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(req.Password)); err != nil {
		log.Printf("[Login] Invalid password for email: %s\n", req.Email)
		http.Error(w, "Invalid credentials.", http.StatusUnauthorized)
		return
	}

	tokenString, err := generateToken(user.ID)
	if err != nil {
		log.Printf("[Login] Token generation failed: %v\n", err)
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	// Configure HTTPOnly cookie containing the JWT token
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    tokenString,
		Expires:  time.Now().Add(24 * time.Hour),
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		Path:     "/",
		SameSite: http.SameSiteStrictMode,
	})

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Login successful",
		"user": map[string]interface{}{
			"id": user.ID,
			"email": user.Email,
			"name": user.Name,
		},
	})
}

func ProviderLoginHandler(w http.ResponseWriter, r *http.Request) {
	var req ProviderLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if req.Provider == "" || req.ProviderID == "" || req.Email == "" {
		http.Error(w, "Missing required provider fields", http.StatusBadRequest)
		return
	}

	// TODO: Verify req.Token with the Provider's server (e.g., Google OAuth API) to ensure it's valid.

	var userID int
	// 1. Check if the provider account is already linked
	queryProvider := `SELECT user_id FROM auth_providers WHERE provider = ? AND provider_id = ?`
	err := database.DB.QueryRow(queryProvider, req.Provider, req.ProviderID).Scan(&userID)

	if err == sql.ErrNoRows {
		// 2. Not linked. Check if user already exists by email
		queryUser := `SELECT id FROM users WHERE email = ?`
		err = database.DB.QueryRow(queryUser, req.Email).Scan(&userID)

		if err == sql.ErrNoRows {
			// 3. User does not exist at all, create a new user
			insertUser := `INSERT INTO users (email, name) VALUES (?, ?)`
			res, err := database.DB.Exec(insertUser, req.Email, req.Name)
			if err != nil {
				http.Error(w, "Failed to create user", http.StatusInternalServerError)
				return
			}
			newID, _ := res.LastInsertId()
			userID = int(newID)
		} else if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		// 4. Link the new or existing user to the provider
		insertProvider := `INSERT INTO auth_providers (user_id, provider, provider_id) VALUES (?, ?, ?)`
		_, err = database.DB.Exec(insertProvider, userID, req.Provider, req.ProviderID)
		if err != nil {
			http.Error(w, "Failed to link auth provider", http.StatusInternalServerError)
			return
		}
	} else if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// 5. Generate standard JWT token for the user
	tokenString, err := generateToken(userID)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    tokenString,
		Expires:  time.Now().Add(24 * time.Hour),
		HttpOnly: true,
		Secure:   false,
		Path:     "/",
		SameSite: http.SameSiteStrictMode,
	})

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Provider login successful",
		"user_id": userID,
	})
}

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		Path:     "/",
		SameSite: http.SameSiteStrictMode,
	})

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Logout successful",
	})
}
