package auth

import "time"

// User matches the users table in the database
type User struct {
	ID           int       `json:"id"`
	Email        string    `json:"email"`
	PasswordHash *string   `json:"-"`
	Name         string    `json:"name"`
	CreatedAt    time.Time `json:"created_at"`
}

// AuthProvider matches the auth_providers table
type AuthProvider struct {
	ID         int       `json:"id"`
	UserID     int       `json:"user_id"`
	Provider   string    `json:"provider"`
	ProviderID string    `json:"provider_id"`
	CreatedAt  time.Time `json:"created_at"`
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

// ProviderLoginRequest holds details for logging in via external providers like Google
type ProviderLoginRequest struct {
	Provider   string `json:"provider"`
	ProviderID string `json:"provider_id"`
	Email      string `json:"email"`
	Name       string `json:"name"`
	// In a real app, you'd send an OAuth token from the frontend and verify it here instead of trusting these fields directly.
	Token      string `json:"token,omitempty"`
}
