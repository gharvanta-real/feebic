package media

import (
	"crypto/sha1"
	"fmt"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v2"

	"server/internal/config"
)

func CloudinarySignature(c *fiber.Ctx) error {
	cfg := config.Load()
	if cfg.CloudinaryCloudName == "" || cfg.CloudinaryAPIKey == "" || cfg.CloudinaryAPISecret == "" {
		return c.Status(http.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in server/.env.",
		})
	}

	username := c.Query("username")
	folderType := c.Query("type")

	folder := cfg.CloudinaryUploadFolder
	if username != "" {
		if folderType != "" {
			folder = fmt.Sprintf("%s/%s/%s", folder, username, folderType)
		} else {
			folder = fmt.Sprintf("%s/%s", folder, username)
		}
	}

	timestamp := time.Now().Unix()
	stringToSign := fmt.Sprintf("folder=%s&timestamp=%d%s", folder, timestamp, cfg.CloudinaryAPISecret)
	sum := sha1.Sum([]byte(stringToSign))

	return c.JSON(fiber.Map{
		"cloud_name": cfg.CloudinaryCloudName,
		"api_key":    cfg.CloudinaryAPIKey,
		"timestamp":  timestamp,
		"folder":     folder,
		"signature":  fmt.Sprintf("%x", sum),
	})
}
