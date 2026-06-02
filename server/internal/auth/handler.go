package auth

import (
	"context"
	"errors"
	"log"
	"net/mail"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	"server/internal/config"
	"server/internal/database"
)

type RegisterRequest struct {
	Email       string  `json:"email"`
	Password    string  `json:"password"`
	Username    string  `json:"username"`
	DisplayName string  `json:"display_name"`
	Role        string  `json:"role"` // "fan" or "creator"
	SubPrice    float64 `json:"sub_price"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Generate JWT helper
func generateToken(userID string, role string, secret string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"role":    role,
		"exp":     time.Now().Add(72 * time.Hour).Unix(),
	})
	return token.SignedString([]byte(secret))
}

func Register(c *fiber.Ctx) error {
	req := new(RegisterRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Validate inputs
	if _, err := mail.ParseAddress(req.Email); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid email address"})
	}
	if len(req.Password) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Password must be at least 6 characters"})
	}
	if req.Username == "" || req.DisplayName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Username and Display Name are required"})
	}
	if req.Role != "fan" && req.Role != "creator" {
		req.Role = "fan" // fallback
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Check if email already exists
	var exists bool
	err := database.Pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", req.Email).Scan(&exists)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error"})
	}
	if exists {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Email is already registered"})
	}

	// Check if username already exists
	err = database.Pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM profiles WHERE username = $1)", req.Username).Scan(&exists)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error"})
	}
	if exists {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Username is already taken"})
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Hashing error"})
	}

	// Execute transaction to insert User + Profile
	tx, err := database.Pool.Begin(ctx)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Transaction initiation failed"})
	}
	defer tx.Rollback(ctx)

	var userID string
	err = tx.QueryRow(ctx, 
		"INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id",
		req.Email, string(hashedPassword), req.Role,
	).Scan(&userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create user account"})
	}

	// Set default avatars if empty
	avatar := "/assets/39bc5c3eed51d62c1022c60686bb459a.png"
	cover := "/assets/cb15617a79d7713ffa4a6de36f808a76.png"
	if req.Role == "creator" {
		avatar = "/assets/082f4723389abb44b68b64dfc082268b.png"
		cover = "/assets/082f4723389abb44b68b64dfc082268b.png"
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO profiles (user_id, username, display_name, avatar, cover_photo, sub_price) 
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		userID, req.Username, req.DisplayName, avatar, cover, req.SubPrice,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create user profile"})
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save profile changes"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "User registered successfully",
		"user": fiber.Map{
			"id":           userID,
			"email":        req.Email,
			"role":         req.Role,
			"username":     req.Username,
			"display_name": req.DisplayName,
		},
	})
}

func Login(c *fiber.Ctx) error {
	req := new(LoginRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var userID string
	var passwordHash string
	var role string

	err := database.Pool.QueryRow(ctx, 
		"SELECT id, password_hash, role FROM users WHERE email = $1", 
		req.Email,
	).Scan(&userID, &passwordHash, &role)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid email or password"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database lookup failed"})
	}

	// Block login for Clerk-managed OAuth accounts using the direct endpoint
	if passwordHash == "clerk-oauth-managed-placeholder-hash" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid email or password"})
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid email or password"})
	}

	// Fetch Profile
	var username, displayName, avatar, cover, bio, location, website string
	var subPrice float64
	err = database.Pool.QueryRow(ctx,
		`SELECT username, display_name, avatar, cover_photo, COALESCE(bio, ''), COALESCE(location, ''), COALESCE(website, ''), sub_price 
		 FROM profiles WHERE user_id = $1`,
		userID,
	).Scan(&username, &displayName, &avatar, &cover, &bio, &location, &website, &subPrice)

	if err != nil {
		log.Printf("⚠️ Warning: Profile not found for userID %s: %v", userID, err)
	}

	// Load config for JWT Secret
	cfg := config.Load()

	// Sign Token
	token, err := generateToken(userID, role, cfg.JWTSecret)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate authorization token"})
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
