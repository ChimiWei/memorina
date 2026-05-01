package database

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

func InitDB(dsn string) error {
	var err error
	DB, err = sql.Open("mysql", dsn)
	if err != nil {
		return err
	}

	if err = DB.Ping(); err != nil {
		return err
	}

	fmt.Println("Successfully connected to MySQL database!")
	return createTables()
}

func createTables() error {
	queryUsers := `
	CREATE TABLE IF NOT EXISTS users (
		id INT AUTO_INCREMENT PRIMARY KEY,
		email VARCHAR(255) NOT NULL UNIQUE,
		password_hash VARCHAR(255) NULL,
		name VARCHAR(255) NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	_, err := DB.Exec(queryUsers)
	if err != nil {
		log.Printf("Error creating users table: %v\n", err)
		return err
	}

	queryProviders := `
	CREATE TABLE IF NOT EXISTS auth_providers (
		id INT AUTO_INCREMENT PRIMARY KEY,
		user_id INT NOT NULL,
		provider VARCHAR(50) NOT NULL,
		provider_id VARCHAR(255) NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(provider, provider_id),
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);`

	_, err = DB.Exec(queryProviders)
	if err != nil {
		log.Printf("Error creating auth_providers table: %v\n", err)
		return err
	}

	queryUserConfigs := `
	CREATE TABLE IF NOT EXISTS user_configs (
		user_id INT PRIMARY KEY,
		config JSON NOT NULL,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);`

	_, err = DB.Exec(queryUserConfigs)
	if err != nil {
		log.Printf("Error creating user_configs table: %v\n", err)
		return err
	}

	queryImages := `
	CREATE TABLE IF NOT EXISTS images (
		id INT AUTO_INCREMENT PRIMARY KEY,
		user_id INT NOT NULL,
		original_filename VARCHAR(255) NOT NULL,
		stored_filename VARCHAR(255) NOT NULL UNIQUE,
		file_size INT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);`

	_, err = DB.Exec(queryImages)
	if err != nil {
		log.Printf("Error creating images table: %v\n", err)
		return err
	}

	fmt.Println("Database tables initialized successfully.")
	return nil
}
