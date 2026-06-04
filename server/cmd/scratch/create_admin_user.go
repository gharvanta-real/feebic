//go:build scratch

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

	email := "gharvanta@gmail.com"
	username := "gharvanta"
	displayName := "Gharvanta Admin"
	role := "creator"
	// Password is "password123"
	testHash := "$2a$10$tM6n66nfeZgM.oN/F0cMPO6F3r4x02uTir1tS3e0a.1/k.kK4K.Ku"

	// Check if user exists
	var existingID string
	err = pool.QueryRow(ctx, "SELECT id FROM users WHERE email = $1", email).Scan(&existingID)
	if err == nil {
		// User exists, update password and role to creator
		_, err = pool.Exec(ctx, "UPDATE users SET password_hash = $1, role = $2 WHERE id = $3", testHash, role, existingID)
		if err != nil {
			log.Fatalf("Error updating existing user: %v", err)
		}
		// Ensure profile email_verified & kyc_verified
		_, err = pool.Exec(ctx, "UPDATE profiles SET email_verified = true, kyc_verified = true WHERE user_id = $1", existingID)
		if err != nil {
			log.Fatalf("Error updating profile: %v", err)
		}
		fmt.Printf("User %s already existed. Password, role, and profile updated successfully.\n", email)
		return
	}

	// Begin transaction to create user
	tx, err := pool.Begin(ctx)
	if err != nil {
		log.Fatalf("Error starting transaction: %v", err)
	}
	defer tx.Rollback(ctx)

	var userID string
	err = tx.QueryRow(ctx,
		"INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id",
		email, testHash, role,
	).Scan(&userID)
	if err != nil {
		log.Fatalf("Error inserting user: %v", err)
	}

	avatar := "/assets/082f4723389abb44b68b64dfc082268b.png"
	cover := "/assets/082f4723389abb44b68b64dfc082268b.png"

	_, err = tx.Exec(ctx,
		`INSERT INTO profiles (user_id, username, display_name, bio, avatar, cover_photo, sub_price, phone, country, email_verified, phone_verified, kyc_verified) 
		 VALUES ($1, $2, $3, 'Official Gharvanta Administrator account.', $4, $5, 0.00, '', 'India', true, true, true)`,
		userID, username, displayName, avatar, cover,
	)
	if err != nil {
		log.Fatalf("Error inserting profile: %v", err)
	}

	err = tx.Commit(ctx)
	if err != nil {
		log.Fatalf("Error committing transaction: %v", err)
	}

	fmt.Printf("Successfully created creator user %s with username @%s and password 'password123'.\n", email, username)
}
