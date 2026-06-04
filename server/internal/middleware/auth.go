package middleware

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"

	"server/internal/config"
	"server/internal/database"
)

func RequireAuth() fiber.Handler {
	cfg := config.Load()

	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Missing authorization token"})
		}

		// Split the Bearer token
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid authorization header format"})
		}

		tokenString := parts[1]

		// Parse token
		token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
			// Validate signing method
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return []byte(cfg.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid or expired authorization token"})
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token payload structure"})
		}

		userID, ok := claims["user_id"].(string)
		if !ok || userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized: Invalid user identifier"})
		}

		role, _ := claims["role"].(string)

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var status string
		if err := database.Pool.QueryRow(ctx, "SELECT COALESCE(status, 'active') FROM users WHERE id = $1", userID).Scan(&status); err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User account no longer exists"})
		}
		if status != "active" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "User account is not active. Please re-authenticate or contact support."})
		}

		// Persist credentials in Fiber context variables
		c.Locals("userID", userID)
		c.Locals("userRole", role)

		return c.Next()
	}
}
