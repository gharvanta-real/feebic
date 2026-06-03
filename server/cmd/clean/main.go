package main

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	dbURL := "postgresql://postgres:Anshu%4019032004@db.baitpgypozjmgfflkyvg.supabase.co:5432/postgres"

	log.Println("Connecting to Supabase PostgreSQL Database...")
	ctx := context.Background()

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer pool.Close()

	log.Println("Successfully connected. Querying accounts...")

	queryCtx, cancelQuery := context.WithTimeout(ctx, 10*time.Second)
	rows, err := pool.Query(queryCtx, "SELECT user_id, username FROM profiles")
	cancelQuery()
	if err != nil {
		log.Fatalf("Failed to query profiles: %v", err)
	}
	defer rows.Close()

	type User struct {
		ID       string
		Username string
	}

	var usersToDelete []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Username); err != nil {
			log.Fatalf("Failed to scan row: %v", err)
		}
		if u.Username != "gharvanta" && u.Username != "anshubhati" {
			usersToDelete = append(usersToDelete, u)
		}
	}
	rows.Close()

	log.Printf("Found %d accounts to delete.", len(usersToDelete))

	for _, u := range usersToDelete {
		log.Printf("Purging @%s (ID: %s)...", u.Username, u.ID)

		deleteCtx, cancelDelete := context.WithTimeout(ctx, 15*time.Second)

		// Delete all dependent records
		_, _ = pool.Exec(deleteCtx, "DELETE FROM transactions WHERE user_id = $1 OR creator_id = $2", u.ID, u.Username)
		_, _ = pool.Exec(deleteCtx, "DELETE FROM subscriptions WHERE user_id = $1 OR creator_username = $2", u.ID, u.Username)
		_, _ = pool.Exec(deleteCtx, "DELETE FROM user_relationships WHERE user_id = $1 OR target_username = $2", u.ID, u.Username)
		_, _ = pool.Exec(deleteCtx, "DELETE FROM post_reports WHERE reported_by = $1 OR post_id IN (SELECT id FROM posts WHERE creator_username = $2)", u.ID, u.Username)
		_, _ = pool.Exec(deleteCtx, "DELETE FROM post_comments WHERE user_id = $1 OR post_id IN (SELECT id FROM posts WHERE creator_username = $2)", u.ID, u.Username)
		_, _ = pool.Exec(deleteCtx, "DELETE FROM posts WHERE creator_username = $2", u.Username)
		_, _ = pool.Exec(deleteCtx, "DELETE FROM stories WHERE creator_username = $2", u.Username)
		_, _ = pool.Exec(deleteCtx, "DELETE FROM admin_appeals WHERE username = $2", u.Username)

		// Delete profiles and users
		_, _ = pool.Exec(deleteCtx, "DELETE FROM profiles WHERE user_id = $1", u.ID)
		_, err = pool.Exec(deleteCtx, "DELETE FROM users WHERE id = $1", u.ID)
		cancelDelete()

		if err != nil {
			log.Printf("WARNING: Failed to delete user record for @%s: %v", u.Username, err)
		} else {
			log.Printf("Successfully purged @%s", u.Username)
		}
	}

	log.Println("Cleaning up any orphaned user accounts...")
	cleanupCtx, cancelCleanup := context.WithTimeout(ctx, 10*time.Second)
	_, _ = pool.Exec(cleanupCtx, "DELETE FROM users WHERE id NOT IN (SELECT user_id FROM profiles) AND email != 'gharvanta@gmail.com' AND email != 'anshu@felbic.com'")
	cancelCleanup()

	log.Println("Database cleaning complete! 🎉")
}
