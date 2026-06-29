package auth

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"memorina-backend/internal/database"
)

type GameConfig struct {
	CardsPerRow int `json:"cardsPerRow"`
	TotalPairs  int `json:"totalPairs"`
}

func GetConfigHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var configJSON string
	query := `SELECT config FROM user_configs WHERE user_id = ?`
	err := database.DB.QueryRow(query, userID).Scan(&configJSON)

	if err != nil {
		if err == sql.ErrNoRows {
			// No config found, return a 404 so caller can use defaults
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
		log.Printf("[GetConfig] DB error for user %d: %v\n", userID, err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(configJSON))
}

func SaveConfigHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req GameConfig
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if req.CardsPerRow <= 0 || req.TotalPairs <= 0 {
		http.Error(w, "Invalid configuration values", http.StatusBadRequest)
		return
	}

	configBytes, err := json.Marshal(req)
	if err != nil {
		http.Error(w, "Failed to marshal config", http.StatusInternalServerError)
		return
	}
	configStr := string(configBytes)

	// UPSERT logic in MySQL (ON DUPLICATE KEY UPDATE)
	query := `
		INSERT INTO user_configs (user_id, config)
		VALUES (?, ?)
		ON DUPLICATE KEY UPDATE config = VALUES(config)
	`
	_, err = database.DB.Exec(query, userID, configStr)
	if err != nil {
		log.Printf("[SaveConfig] Failed to save config for user %d: %v\n", userID, err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Config saved successfully",
	})
}

func GetPublicConfigHandler(w http.ResponseWriter, r *http.Request) {
	googleClientID := os.Getenv("GOOGLE_OAUTH_CLIENT")
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"googleClientId": googleClientID,
	})
}
