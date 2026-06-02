package vault

import (
	"context"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v2"

	"server/internal/database"
)

type AddVaultRequest struct {
	Name string `json:"name"`
	URL  string `json:"url"`
	Type string `json:"type"`
	Size string `json:"size"`
}

// 1. Get creator vault assets (Creators only)
func GetVault(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	userRole := c.Locals("userRole").(string)

	if userRole != "creator" {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Only creators can access the media vault"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rows, err := database.Pool.Query(ctx,
		`SELECT id, name, url, type, size, usage_count, created_at 
		 FROM vault_items 
		 WHERE creator_id = $1 
		 ORDER BY created_at DESC`,
		userID,
	)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to query vault assets"})
	}
	defer rows.Close()

	vaultItems := []fiber.Map{}
	for rows.Next() {
		var id, name, url, fileType, size string
		var usageCount int
		var createdAt time.Time

		err := rows.Scan(&id, &name, &url, &fileType, &size, &usageCount, &createdAt)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse vault row"})
		}

		vaultItems = append(vaultItems, fiber.Map{
			"id":          id,
			"name":        name,
			"url":         url,
			"type":        fileType,
			"size":        size,
			"usage_count": usageCount,
			"date":        createdAt.Format("Jan 02, 2006"), // match UI vault display format
		})
	}

	return c.JSON(vaultItems)
}

// 2. Add asset metadata to vault (Creators only)
func AddToVault(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	userRole := c.Locals("userRole").(string)

	if userRole != "creator" {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Only creators are allowed to write to the media vault"})
	}

	req := new(AddVaultRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Name == "" || req.URL == "" || req.Type == "" || req.Size == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Missing required asset specifications"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := database.Pool.Exec(ctx,
		`INSERT INTO vault_items (creator_id, name, url, type, size) 
		 VALUES ($1, $2, $3, $4, $5)`,
		userID, req.Name, req.URL, req.Type, req.Size,
	)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save vault record"})
	}

	return c.Status(http.StatusCreated).JSON(fiber.Map{"message": "Asset added to vault successfully"})
}
