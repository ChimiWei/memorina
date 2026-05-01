package images

import "time"

// Image represents a user-uploaded image stored in the database
type Image struct {
	ID               int       `json:"id"`
	UserID           int       `json:"user_id"`
	OriginalFilename string    `json:"original_filename"`
	StoredFilename   string    `json:"stored_filename"`
	URL              string    `json:"url"`
	FileSize         int       `json:"file_size"`
	CreatedAt        time.Time `json:"created_at"`
}
