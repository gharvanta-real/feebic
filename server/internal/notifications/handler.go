package notifications

import (
	"context"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v2"

	"server/internal/database"
)

// 1. Get user notifications
func GetNotifications(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rows, err := database.Pool.Query(ctx,
		`SELECT n.id, n.type, n.text, COALESCE(n.amount, 0.00), n.is_read, n.created_at, 
		        p.display_name, COALESCE(p.avatar, '')
		 FROM notifications n
		 JOIN profiles p ON n.sender_id = p.user_id
		 WHERE n.user_id = $1
		 ORDER BY n.created_at DESC`,
		userID,
	)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to query notifications list"})
	}
	defer rows.Close()

	notifications := []fiber.Map{}
	for rows.Next() {
		var id, notifType, text, senderName, senderAvatar string
		var amount float64
		var isRead bool
		var createdAt time.Time

		err := rows.Scan(&id, &notifType, &text, &amount, &isRead, &createdAt, &senderName, &senderAvatar)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse notification row"})
		}

		notifications = append(notifications, fiber.Map{
			"id":            id,
			"type":          notifType,
			"text":          text,
			"amount":        amount,
			"read":          isRead,
			"time":          createdAt.Format(time.RFC3339),
			"sender_name":   senderName,
			"sender_avatar": senderAvatar,
		})
	}

	return c.JSON(notifications)
}

// 2. Mark notifications as read/dismiss/clear
func MarkRead(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var req struct {
		ID     string `json:"id"`
		Action string `json:"action"`
	}

	// Parsing body is optional
	_ = c.BodyParser(&req)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var err error
	if req.Action == "dismiss" && req.ID != "" {
		_, err = database.Pool.Exec(ctx,
			"DELETE FROM notifications WHERE user_id = $1 AND id = $2",
			userID, req.ID,
		)
	} else if req.Action == "clear_all" {
		_, err = database.Pool.Exec(ctx,
			"DELETE FROM notifications WHERE user_id = $1",
			userID,
		)
	} else {
		_, err = database.Pool.Exec(ctx,
			"UPDATE notifications SET is_read = TRUE WHERE user_id = $1",
			userID,
		)
	}

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update notification status"})
	}

	return c.JSON(fiber.Map{"message": "Notifications updated successfully"})
}
