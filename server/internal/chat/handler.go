package chat

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"server/internal/database"
)

type SendMessageRequest struct {
	ReceiverUsername string  `json:"receiver_username"`
	Message          string  `json:"message"`
	MediaURL         string  `json:"media_url"`
	MediaType        string  `json:"media_type"`
	IsPPV            bool    `json:"is_ppv"`
	Price            float64 `json:"price"`
}

type BroadcastMessageRequest struct {
	Message    string  `json:"message"`
	MediaURL   string  `json:"media_url"`
	MediaType  string  `json:"media_type"`
	IsPPV      bool    `json:"is_ppv"`
	Price      float64 `json:"price"`
	TargetList string  `json:"target_list"`
}

// 1. Get inbox conversation threads with last message preview
func GetConversations(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// High-fidelity SQL query fetching unique last messages per thread pairing
	query := `
		WITH last_messages AS (
			SELECT DISTINCT ON (
				CASE WHEN sender_id < receiver_id THEN sender_id ELSE receiver_id END,
				CASE WHEN sender_id < receiver_id THEN receiver_id ELSE sender_id END
			)
			id, sender_id, receiver_id, message, created_at
			FROM chat_messages
			WHERE sender_id = $1 OR receiver_id = $1
			ORDER BY 
				CASE WHEN sender_id < receiver_id THEN sender_id ELSE receiver_id END,
				CASE WHEN sender_id < receiver_id THEN receiver_id ELSE sender_id END,
				created_at DESC
		)
		SELECT lm.id, COALESCE(lm.message, 'Sent an attachment'), lm.created_at,
		       CASE WHEN lm.sender_id = $1 THEN lm.receiver_id ELSE lm.sender_id END AS contact_id,
		       p.username, p.display_name, COALESCE(p.avatar, ''), u.role::text
		FROM last_messages lm
		JOIN profiles p ON p.user_id = CASE WHEN lm.sender_id = $1 THEN lm.receiver_id ELSE lm.sender_id END
		JOIN users u ON u.id = p.user_id
		ORDER BY lm.created_at DESC
	`

	rows, err := database.Pool.Query(ctx, query, userID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load conversation list"})
	}
	defer rows.Close()

	conversations := []fiber.Map{}
	for rows.Next() {
		var msgID, message, contactID, username, displayName, avatar, role string
		var createdAt time.Time

		err := rows.Scan(&msgID, &message, &createdAt, &contactID, &username, &displayName, &avatar, &role)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse conversation row"})
		}

		conversations = append(conversations, fiber.Map{
			"id":            msgID,
			"username":      username,
			"name":          displayName,
			"avatar":        avatar,
			"role":          role,
			"last_message":  message,
			"last_msg_time": createdAt.Format("15:04"), // HH:MM
		})
	}

	return c.JSON(conversations)
}

// 2. Fetch conversation history with a specific creator/fan by username
func GetMessages(c *fiber.Ctx) error {
	viewerID := c.Locals("userID").(string)
	contactUsername := c.Params("username")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Resolve contact's user UUID from username
	var contactID string
	err := database.Pool.QueryRow(ctx,
		"SELECT user_id FROM profiles WHERE username = $1",
		contactUsername,
	).Scan(&contactID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "User does not exist"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Database lookup failed"})
	}

	// Retrieve conversation messages
	rows, err := database.Pool.Query(ctx,
		`SELECT id, sender_id, receiver_id, COALESCE(message, ''), COALESCE(media_url, ''), 
		        COALESCE(media_type, ''), is_ppv, price, created_at 
		 FROM chat_messages 
		 WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
		 ORDER BY created_at ASC`,
		viewerID, contactID,
	)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load chat history"})
	}
	defer rows.Close()

	messages := []fiber.Map{}
	for rows.Next() {
		var id, senderID, receiverID, text, mediaURL, mediaType string
		var isPPV bool
		var price float64
		var createdAt time.Time

		err := rows.Scan(&id, &senderID, &receiverID, &text, &mediaURL, &mediaType, &isPPV, &price, &createdAt)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse chat message row"})
		}

		// Format sender parameter to match frontend client state
		senderStr := "user"
		if senderID == contactID {
			senderStr = contactUsername
		}

		// Security Check: Verify locked media attachment status
		// For PPV (Pay-Per-View), verify if the viewer has unlocked the content.
		// Fan is unlocked if they bought it. Let's write a simple query.
		// Wait, a message is unlocked if it is paid or if sender == viewer.
		isUnlocked := false
		if isPPV {
			if senderID == viewerID {
				isUnlocked = true
			} else {
				// Verify in transactions if user bought this specific attachment
				// We search transaction titles containing this msg ID or custom log entries
				var bought bool
				err := database.Pool.QueryRow(ctx,
					`SELECT EXISTS(
						SELECT 1 FROM transactions 
						WHERE user_id = $1 AND type = 'tip' AND title LIKE $2
					)`,
					viewerID, "%Unlock Message "+id+"%",
				).Scan(&bought)

				if err == nil && bought {
					isUnlocked = true
				}
			}
		} else {
			isUnlocked = true
		}

		outputMedia := mediaURL
		if isPPV && !isUnlocked {
			outputMedia = "" // Wipe path for security
		}

		messages = append(messages, fiber.Map{
			"id":         id,
			"sender":     senderStr,
			"text":       text,
			"mediaUrl":   outputMedia,
			"mediaType":  mediaType,
			"isPPV":      isPPV,
			"price":      price,
			"isUnlocked": isUnlocked,
			"time":       createdAt.Format("15:04"),
		})
	}

	return c.JSON(messages)
}

// 3. Send message
func SendMessage(c *fiber.Ctx) error {
	senderID := c.Locals("userID").(string)

	req := new(SendMessageRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.ReceiverUsername == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Receiver username is required"})
	}
	if req.Message == "" && req.MediaURL == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Cannot send empty message"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Resolve receiver UUID from username
	var receiverID string
	err := database.Pool.QueryRow(ctx,
		"SELECT user_id FROM profiles WHERE username = $1",
		req.ReceiverUsername,
	).Scan(&receiverID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Recipient user does not exist"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Database lookup failed"})
	}

	// Insert message
	var msgID string
	var createdAt time.Time
	err = database.Pool.QueryRow(ctx,
		`INSERT INTO chat_messages (sender_id, receiver_id, message, media_url, media_type, is_ppv, price) 
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, created_at`,
		senderID, receiverID, req.Message, req.MediaURL, req.MediaType, req.IsPPV, req.Price,
	).Scan(&msgID, &createdAt)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save message"})
	}

	// Trigger real-time broadcast and notification
	BroadcastMessageEvent(ctx, msgID, senderID, receiverID, req.Message, req.MediaURL, req.MediaType, req.IsPPV, req.Price, createdAt)

	return c.Status(http.StatusCreated).JSON(fiber.Map{"message": "Message sent successfully"})
}

func BroadcastMessage(c *fiber.Ctx) error {
	senderID := c.Locals("userID").(string)
	userRole := c.Locals("userRole").(string)
	if userRole != "creator" {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Only creators can send broadcast messages"})
	}

	req := new(BroadcastMessageRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.Message == "" && req.MediaURL == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Cannot broadcast an empty message"})
	}
	if req.IsPPV && req.Price <= 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "PPV broadcast requires a valid unlock price"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	var rows pgx.Rows
	var err error

	if req.TargetList == "" || req.TargetList == "all" {
		rows, err = database.Pool.Query(ctx,
			`SELECT fan_id
			 FROM subscriptions
			 WHERE creator_id = $1 AND status = 'active' AND expires_at > NOW()`,
			senderID,
		)
	} else if req.TargetList == "favorites" {
		rows, err = database.Pool.Query(ctx,
			`SELECT creator_id
			 FROM creator_favorites
			 WHERE user_id = $1`,
			senderID,
		)
	} else {
		// Check ownership of custom list first
		var exists bool
		err = database.Pool.QueryRow(ctx,
			`SELECT EXISTS(SELECT 1 FROM custom_lists WHERE id = $1 AND creator_id = $2)`,
			req.TargetList, senderID,
		).Scan(&exists)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to verify custom list ownership"})
		}
		if !exists {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Unauthorized custom list or list not found"})
		}

		rows, err = database.Pool.Query(ctx,
			`SELECT user_id
			 FROM custom_list_members
			 WHERE list_id = $1`,
			req.TargetList,
		)
	}

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load recipient users"})
	}
	defer rows.Close()

	tx, err := database.Pool.Begin(ctx)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to start broadcast"})
	}
	defer tx.Rollback(ctx)

	type broadcastDetail struct {
		msgID      string
		receiverID string
		createdAt  time.Time
	}
	var details []broadcastDetail

	count := 0
	for rows.Next() {
		var receiverID string
		if err := rows.Scan(&receiverID); err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse subscriber"})
		}
		var msgID string
		var createdAt time.Time
		err = tx.QueryRow(ctx,
			`INSERT INTO chat_messages (sender_id, receiver_id, message, media_url, media_type, is_ppv, price)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)
			 RETURNING id, created_at`,
			senderID, receiverID, req.Message, req.MediaURL, req.MediaType, req.IsPPV, req.Price,
		).Scan(&msgID, &createdAt)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save broadcast message"})
		}
		details = append(details, broadcastDetail{
			msgID:      msgID,
			receiverID: receiverID,
			createdAt:  createdAt,
		})
		count++
	}
	if rows.Err() != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to read subscribers"})
	}

	if err := tx.Commit(ctx); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to complete broadcast"})
	}

	// Trigger async broadcasts for all active subscriber sessions
	go func() {
		bgCtx, bgCancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer bgCancel()
		for _, d := range details {
			BroadcastMessageEvent(bgCtx, d.msgID, senderID, d.receiverID, req.Message, req.MediaURL, req.MediaType, req.IsPPV, req.Price, d.createdAt)
		}
	}()

	return c.Status(http.StatusCreated).JSON(fiber.Map{
		"message":       "Broadcast sent successfully",
		"delivered_to":  count,
		"has_receivers": count > 0,
	})
}
