package auth

import "time"

// User matches the users table in the database
type User struct {
	ID           int       `json:"id"`
	Email        string    `json:"email"`
	PasswordHash *string   `json:"-"`         // Use pointer to handle potentially null values (from Google login users)
	GoogleID     *string   `json:"google_id"` // Included for future implementation
	Name         string    `json:"name"`
	CreatedAt    time.Time `json:"created_at"`
}

// RegisterRequest holds details for registering a new user via standard email/password
type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

// LoginRequest holds details for logging in via standard email/password
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}
