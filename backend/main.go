package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"memorina-backend/internal/auth"
	"memorina-backend/internal/database"

	"github.com/joho/godotenv"
)

func helloHandler(w http.ResponseWriter, r *http.Request) {
	var arr = []string{"teste", "teste 2"}
	var test string = strings.Join(arr, ", ")
	fmt.Fprintf(w, test)
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

	// Define Routes using Go 1.22+ method matching
	http.HandleFunc("GET /", helloHandler)
	http.HandleFunc("POST /register", auth.RegisterHandler)
	http.HandleFunc("POST /login", auth.LoginHandler)

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
