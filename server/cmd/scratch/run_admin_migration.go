//go:build scratch

package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env relative to current execution context or from server dir
	_ = godotenv.Load()
	_ = godotenv.Load("../.env")
	_ = godotenv.Load("e:/new-project/server/.env")

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is not set in environment or .env file")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer pool.Close()

	// Read e:\new-project\server\admin_migration.sql
	migrationFile := "admin_migration.sql"
	sqlBytes, err := os.ReadFile(migrationFile)
	if err != nil {
		sqlBytes, err = os.ReadFile(filepath.Join("e:", "new-project", "server", "admin_migration.sql"))
		if err != nil {
			log.Fatalf("Error reading admin_migration.sql: %v", err)
		}
	}

	_, err = pool.Exec(ctx, string(sqlBytes))
	if err != nil {
		log.Fatalf("Error executing admin_migration.sql: %v", err)
	}

	fmt.Println("✅ Successfully executed admin_migration.sql on the database!")
}
