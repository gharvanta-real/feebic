package auth

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"

	"server/internal/config"
	"server/internal/database"
)

type ClerkSyncRequest struct {
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
	Avatar      string `json:"avatar"`
}

// 1. Sync Clerk authenticated profiles with local PostgreSQL database
func ClerkSync(c *fiber.Ctx) error {
	req := new(ClerkSyncRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Email == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Email address is required for authentication sync"})
	}

	if req.DisplayName == "" {
		req.DisplayName = strings.Split(req.Email, "@")[0]
	}
	if req.Avatar == "" {
		req.Avatar = "/assets/39bc5c3eed51d62c1022c60686bb459a.png"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	var userID, role string
	var emailExists bool

	// Check if user exists by email
	err := database.Pool.QueryRow(ctx,
		"SELECT id, role::text FROM users WHERE email = $1",
		req.Email,
	).Scan(&userID, &role)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			emailExists = false
		} else {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Database lookup failed"})
		}
	} else {
		emailExists = true
	}

	// Fetch config for signing secret
	cfg := config.Load()

	if emailExists {
		// User already exists, update display name and avatar conditionally
		var currentAvatar string
		err = database.Pool.QueryRow(ctx,
			"SELECT COALESCE(avatar, '') FROM profiles WHERE user_id = $1",
			userID,
		).Scan(&currentAvatar)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to retrieve profile details"})
		}

		if currentAvatar == "" ||
			currentAvatar == "/assets/39bc5c3eed51d62c1022c60686bb459a.png" ||
			currentAvatar == "/assets/082f4723389abb44b68b64dfc082268b.png" {
			_, err = database.Pool.Exec(ctx,
				`UPDATE profiles SET display_name = $1, avatar = $2 WHERE user_id = $3`,
				req.DisplayName, req.Avatar, userID,
			)
		} else {
			_, err = database.Pool.Exec(ctx,
				`UPDATE profiles SET display_name = $1 WHERE user_id = $2`,
				req.DisplayName, userID,
			)
		}
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update profile details"})
		}
	} else {
		// New OAuth sign up, create user record in transaction
		tx, err := database.Pool.Begin(ctx)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Database transaction failure"})
		}
		defer tx.Rollback(ctx)

		// Set default role to fan
		role = "fan"

		// Insert user
		err = tx.QueryRow(ctx,
			"INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id",
			req.Email, "clerk-oauth-managed-placeholder-hash", role,
		).Scan(&userID)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create user record"})
		}

		// Clean and derive unique username from email
		baseUsername := strings.ToLower(strings.Split(req.Email, "@")[0])
		reg, _ := regexp.Compile("[^a-z0-9_]")
		username := reg.ReplaceAllString(baseUsername, "")
		if username == "" {
			username = "user"
		}

		// Ensure username uniqueness recursively
		finalUsername := username
		for i := 1; i < 1000; i++ {
			var exists bool
			err = tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM profiles WHERE username = $1)", finalUsername).Scan(&exists)
			if err == nil && !exists {
				break
			}
			finalUsername = fmt.Sprintf("%s%d", username, i)
		}
		username = finalUsername

		// Insert profile
		_, err = tx.Exec(ctx,
			`INSERT INTO profiles (user_id, username, display_name, avatar, cover_photo) 
			 VALUES ($1, $2, $3, $4, $5)`,
			userID, username, req.DisplayName, req.Avatar, "/assets/cb15617a79d7713ffa4a6de36f808a76.png",
		)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate profile"})
		}

		// Seed initial wallet deposit of $450.00
		_, err = tx.Exec(ctx,
			"INSERT INTO transactions (user_id, amount, type, title) VALUES ($1, 450.00, 'deposit', 'Initial starting balance')",
			userID,
		)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to seed starting wallet balance"})
		}

		// Commit transaction
		if err = tx.Commit(ctx); err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to finalize database records"})
		}
	}

	// Generate and sign Go monolith authorization token
	tokenClaims := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"role":    role,
		"exp":     time.Now().Add(72 * time.Hour).Unix(),
	})
	token, err := tokenClaims.SignedString([]byte(cfg.JWTSecret))
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Authorization token signing failed"})
	}

	// Retrieve profile details for frontend context initialization
	var username, displayName, avatar, cover, bio, location, website string
	var subPrice float64
	err = database.Pool.QueryRow(ctx,
		`SELECT username, display_name, avatar, cover_photo, COALESCE(bio, ''), COALESCE(location, ''), COALESCE(website, ''), sub_price 
		 FROM profiles WHERE user_id = $1`,
		userID,
	).Scan(&username, &displayName, &avatar, &cover, &bio, &location, &website, &subPrice)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to reload profile metadata"})
	}

	return c.JSON(fiber.Map{
		"token": token,
		"user": fiber.Map{
			"id":           userID,
			"email":        req.Email,
			"role":         role,
			"username":     username,
			"display_name": displayName,
			"avatar":       avatar,
			"cover_photo":  cover,
			"bio":          bio,
			"location":     location,
			"website":      website,
			"sub_price":    subPrice,
		},
	})
}
