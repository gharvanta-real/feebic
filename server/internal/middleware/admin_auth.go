package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	"server/internal/adminauth"
	"server/internal/database"
)

// RequireAdminAuth validates the admin JWT (separate from user JWT)
// and populates Locals: adminStaffID, adminUsername, adminRole
func RequireAdminAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Admin authorization token required",
			})
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid authorization header format",
			})
		}

		tokenString := parts[1]
		staffID, username, role, err := adminauth.ParseAdminToken(tokenString)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid or expired admin token. Please login again.",
			})
		}

		// Verify staff is still active in DB (catches deactivated accounts)
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var isActive bool
		dbErr := database.Pool.QueryRow(ctx,
			"SELECT COALESCE(is_active, true) FROM admin_staff WHERE id = $1",
			staffID,
		).Scan(&isActive)

		if dbErr != nil || !isActive {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Staff account not found or has been deactivated",
			})
		}

		var sessionActive bool
		sessionHash := adminauth.HashAdminSessionToken(tokenString)
		dbErr = database.Pool.QueryRow(ctx,
			`SELECT EXISTS (
				SELECT 1 FROM admin_sessions
				WHERE staff_id = $1
				  AND session_token = $2
				  AND is_revoked = false
				  AND expires_at > CURRENT_TIMESTAMP
			)`,
			staffID, sessionHash,
		).Scan(&sessionActive)
		if dbErr != nil || !sessionActive {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Admin session has expired or was revoked. Please login again.",
			})
		}

		c.Locals("adminStaffID", staffID)
		c.Locals("adminUsername", username)
		c.Locals("adminRole", role)

		return c.Next()
	}
}

// RequireAdminStep1Auth validates the short-lived admin step1 token
// (for TOTP setup and confirm phase before 2FA is active)
func RequireAdminStep1Auth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Admin step1 token required",
			})
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid authorization header format",
			})
		}

		staffID, email, err := adminauth.ParseStep1Token(parts[1])
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid or expired step1 token. Please login again.",
			})
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var username, role string
		var isActive bool
		dbErr := database.Pool.QueryRow(ctx,
			"SELECT username, role, COALESCE(is_active, true) FROM admin_staff WHERE id = $1",
			staffID,
		).Scan(&username, &role, &isActive)

		if dbErr != nil || !isActive {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Staff account not found or has been deactivated",
			})
		}

		c.Locals("adminStaffID", staffID)
		c.Locals("adminUsername", username)
		c.Locals("adminRole", role)
		c.Locals("adminEmail", email)

		return c.Next()
	}
}

// RequireAdminRole checks that the admin has one of the specified roles
func RequireAdminRole(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, ok := c.Locals("adminRole").(string)
		if !ok || role == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Admin authentication required",
			})
		}
		for _, r := range roles {
			if role == r {
				return c.Next()
			}
		}
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": fmt.Sprintf("Access denied: requires role %s (your role: %s)", strings.Join(roles, " or "), role),
		})
	}
}

// LogAdminAction middleware — automatically logs every admin API call to DB
func LogAdminAction() fiber.Handler {
	return func(c *fiber.Ctx) error {
		err := c.Next()

		username, _ := c.Locals("adminUsername").(string)
		role, _ := c.Locals("adminRole").(string)

		if username == "" {
			return err
		}

		// Build action string from method + path
		action := fmt.Sprintf("%s %s", c.Method(), c.Path())
		targetType := "api"
		targetID := ""

		// Extract target from path params if present
		if u := c.Params("username"); u != "" {
			targetType = "user"
			targetID = u
		} else if id := c.Params("id"); id != "" {
			targetID = id
			if strings.Contains(c.Path(), "/posts/") {
				targetType = "post"
			} else if strings.Contains(c.Path(), "/appeals/") {
				targetType = "appeal"
			} else if strings.Contains(c.Path(), "/staff/") {
				targetType = "staff"
			}
		}

		details := map[string]interface{}{
			"ip":          c.IP(),
			"status_code": c.Response().StatusCode(),
			"user_agent":  c.Get("User-Agent"),
		}

		// Only log mutating actions (POST, PUT, DELETE)
		if c.Method() != "GET" {
			detailsJSON, _ := json.Marshal(details)
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			_, _ = database.Pool.Exec(ctx,
				`INSERT INTO admin_audit_logs (admin_username, admin_role, action, target_type, target_id, details)
				 VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
				username, role, action, targetType, targetID, string(detailsJSON),
			)
		}

		return err
	}
}
