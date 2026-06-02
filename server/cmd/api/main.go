package main

import (
	"context"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"

	"server/internal/config"
	"server/internal/database"
	"server/internal/routes"
)

func main() {
	// 1. Load Server Config Settings
	cfg := config.Load()

	// 2. Initialize PostgreSQL Database Pool
	_, err := database.Connect(cfg.DatabaseURL)

	if err != nil {
		log.Fatalf("❌ Database connection error: %v", err)
	}
	defer database.Close()

	// 3. Run Schema Migrations and Creator Seeding
	if err := database.RunMigrations(); err != nil {
		log.Fatalf("❌ Database migration error: %v", err)
	}

	// Start background cleaner for expired stories
	go startExpiredStoriesCleaner()

	app := fiber.New()

	// 4. Global Middleware Configuration
	app.Use(cors.New(cors.Config{
		AllowOrigins: "http://localhost:3000,http://127.0.0.1:3000",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, DELETE, OPTIONS",
	}))
	app.Use(logger.New())

	// 5. Connect HTTP Endpoints Router
	routes.SetupRoutes(app)

	// Health check route (fallback check)
	app.Get("/api/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":   "healthy",
			"database": "connected",
			"message":  "Felbic Go Modular Monolith API Server is running",
		})
	})

	// Start listening
	log.Printf("🚀 Server is running on port :%s...", cfg.Port)
	log.Fatal(app.Listen(":" + cfg.Port))
}

func startExpiredStoriesCleaner() {
	ticker := time.NewTicker(30 * time.Minute)
	defer ticker.Stop()

	// Run cleanup immediately on startup as well
	cleanExpiredStories()

	for range ticker.C {
		cleanExpiredStories()
	}
}

func cleanExpiredStories() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if database.Pool == nil {
		log.Println("⚠️ Background cleaner: Database pool is nil, skipping stories cleanup")
		return
	}

	tag, err := database.Pool.Exec(ctx, "DELETE FROM stories WHERE expires_at < NOW()")
	if err != nil {
		log.Printf("❌ Background cleaner: Failed to delete expired stories: %v", err)
		return
	}
	rowsAffected := tag.RowsAffected()
	if rowsAffected > 0 {
		log.Printf("🧹 Background cleaner: Deleted %d expired stories", rowsAffected)
	}
}

