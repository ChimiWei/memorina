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

	// Initialize Garage S3 storage
	garageEndpoint := os.Getenv("GARAGE_HOST")
	garageAccessKey := os.Getenv("GARAGE_USER")
	garageSecretKey := os.Getenv("GARAGE_PASSWORD")
	garageBucket := os.Getenv("GARAGE_BUCKET")
	garageUseSSL := os.Getenv("GARAGE_USE_SSL") == "true"

	if garageEndpoint == "" || garageAccessKey == "" || garageSecretKey == "" {
		log.Fatal("Garage configuration is incomplete. Set GARAGE_HOST, GARAGE_USER, and GARAGE_PASSWORD.")
	}
	if garageBucket == "" {
		garageBucket = "memorina"
	}

	storage, err := images.NewGarageStorage(garageEndpoint, garageAccessKey, garageSecretKey, garageBucket, garageUseSSL)
	if err != nil {
		log.Fatalf("Failed to initialize Garage S3 storage: %v", err)
	}
	images.Storage = storage
	fmt.Printf("Garage S3 connected: %s (bucket: %s)\n", garageEndpoint, garageBucket)

	// Define Routes using Go 1.22+ method matching
	http.HandleFunc("GET /ping", pingHandler)
	http.HandleFunc("POST /register", auth.RegisterHandler)
	http.HandleFunc("POST /login", auth.LoginHandler)
	http.HandleFunc("POST /login/provider", auth.ProviderLoginHandler)
	http.HandleFunc("POST /logout", auth.LogoutHandler)
	http.HandleFunc("POST /forgot-password", auth.ForgotPasswordHandler)
	http.HandleFunc("POST /reset-password", auth.ResetPasswordHandler)
	http.HandleFunc("GET /config/public", auth.GetPublicConfigHandler)

	http.HandleFunc("GET /user/config", auth.AuthMiddleware(auth.GetConfigHandler))
	http.HandleFunc("POST /user/config", auth.AuthMiddleware(auth.SaveConfigHandler))

	// Image routes (all authenticated)
	http.HandleFunc("POST /images", auth.AuthMiddleware(images.UploadHandler))
	http.HandleFunc("GET /images", auth.AuthMiddleware(images.ListHandler))
	http.HandleFunc("DELETE /images/", auth.AuthMiddleware(images.DeleteHandler))
	http.HandleFunc("GET /images/{path...}", auth.AuthMiddleware(images.ImageHandler()))

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
