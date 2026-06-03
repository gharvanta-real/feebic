package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is not set in .env")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer pool.Close()

	// 1. Let's see the users in the database
	rows, err := pool.Query(ctx, "SELECT id, email, role FROM users")
	if err != nil {
		log.Fatalf("Error querying users: %v", err)
	}
	defer rows.Close()

	fmt.Println("Users currently in DB:")
	var emails []string
	for rows.Next() {
		var id, email, role string
		if err := rows.Scan(&id, &email, &role); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		fmt.Printf("- ID: %s, Email: %s, Role: %s\n", id, email, role)
		emails = append(emails, email)
	}

	// Bcrypt hash for "password123"
	testHash := "$2a$10$tM6n66nfeZgM.oN/F0cMPO6F3r4x02uTir1tS3e0a.1/k.kK4K.Ku"

	// Reset fan password
	result, err := pool.Exec(ctx, "UPDATE users SET password_hash = $1 WHERE email = $2", testHash, "fan@creatorhub.com")
	if err != nil {
		log.Fatalf("Error updating fan@creatorhub.com password: %v", err)
	}
	fmt.Printf("Reset fan password result: %d rows updated\n", result.RowsAffected())

	// Reset creator passwords
	creators := []string{
		"lana@creatorhub.com",
		"demi@creatorhub.com",
		"amouranth@creatorhub.com",
		"austin@creatorhub.com",
	}
	for _, email := range creators {
		result, err := pool.Exec(ctx, "UPDATE users SET password_hash = $1 WHERE email = $2", testHash, email)
		if err != nil {
			log.Printf("Error updating %s password: %v", email, err)
		} else {
			fmt.Printf("Reset %s password result: %d rows updated\n", email, result.RowsAffected())
		}
	}
}
