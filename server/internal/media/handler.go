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

	timestamp := time.Now().Unix()
	stringToSign := fmt.Sprintf("folder=%s&timestamp=%d%s", cfg.CloudinaryUploadFolder, timestamp, cfg.CloudinaryAPISecret)
	sum := sha1.Sum([]byte(stringToSign))

	return c.JSON(fiber.Map{
		"cloud_name": cfg.CloudinaryCloudName,
		"api_key":    cfg.CloudinaryAPIKey,
		"timestamp":  timestamp,
		"folder":     cfg.CloudinaryUploadFolder,
		"signature":  fmt.Sprintf("%x", sum),
	})
}
