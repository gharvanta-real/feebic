package chat

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"

	"server/internal/config"
	"server/internal/database"
)

// Client represents a connected WebSocket user session.
type Client struct {
	UserID string
	Conn   *websocket.Conn
	mu     sync.Mutex
}

// Hub manages all active WebSocket connections.
type Hub struct {
	clients    map[string][]*Client
	register   chan *Client
	unregister chan *Client
	mutex      sync.RWMutex
}

// GlobalHub is the singleton connection manager.
var GlobalHub = &Hub{
	clients:    make(map[string][]*Client),
	register:   make(chan *Client),
	unregister: make(chan *Client),
}

func init() {
	go GlobalHub.Run()
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client.UserID] = append(h.clients[client.UserID], client)
			h.mutex.Unlock()
			log.Printf("WS: Registered client for User ID: %s", client.UserID)

		case client := <-h.unregister:
			h.mutex.Lock()
			sessions := h.clients[client.UserID]
			for i, c := range sessions {
				if c == client {
					_ = c.Conn.Close()
					h.clients[client.UserID] = append(sessions[:i], sessions[i+1:]...)
					break
				}
			}
			if len(h.clients[client.UserID]) == 0 {
				delete(h.clients, client.UserID)
			}
			h.mutex.Unlock()
			log.Printf("WS: Unregistered client for User ID: %s", client.UserID)
		}
	}
}

// BroadcastToUser sends a JSON payload to all active connections for a user.
func (h *Hub) BroadcastToUser(userID string, payload interface{}) {
	h.mutex.RLock()
	sessions, ok := h.clients[userID]
	h.mutex.RUnlock()

	if !ok || len(sessions) == 0 {
		return
	}

	data, err := json.Marshal(payload)
	if err != nil {
		log.Printf("WS: Failed to marshal broadcast payload: %v", err)
		return
	}

	for _, client := range sessions {
		go func(c *Client) {
			if err := c.WriteMessage(websocket.TextMessage, data); err != nil {
				log.Printf("WS: Error writing to client %s: %v", c.UserID, err)
				GlobalHub.unregister <- c
			}
		}(client)
	}
}

func (c *Client) WriteMessage(messageType int, data []byte) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.Conn.WriteMessage(messageType, data)
}

// WSMessagePayload represents a standard message from a WS client.
type WSMessagePayload struct {
	ReceiverUsername string  `json:"receiver_username"`
	Message          string  `json:"message"`
	MediaURL         string  `json:"media_url"`
	MediaType        string  `json:"media_type"`
	IsPPV            bool    `json:"is_ppv"`
	Price            float64 `json:"price"`
}

// WSEvent defines the structure of events sent over WebSockets.
type WSEvent struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
}

// WebSocketUpgradeMiddleware authenticates the request and upgrades it to WebSockets.
func WebSocketUpgradeMiddleware(c *fiber.Ctx) error {
	if !websocket.IsWebSocketUpgrade(c) {
		return fiber.ErrUpgradeRequired
	}

	tokenString := c.Get("Authorization")
	if tokenString == "" {
		tokenString = c.Query("token")
	} else {
		parts := strings.Split(tokenString, " ")
		if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
			tokenString = parts[1]
		}
	}

	if tokenString == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Missing authorization token"})
	}

	cfg := config.Load()
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(cfg.JWTSecret), nil
	})

	if err != nil || !token.Valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid or expired token"})
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token structure"})
	}

	userID, ok := claims["user_id"].(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid user identifier"})
	}

	role, _ := claims["role"].(string)

	c.Locals("userID", userID)
	c.Locals("userRole", role)

	return c.Next()
}

// WebSocketHandler manages WebSocket connection lifecycles and message exchange.
func WebSocketHandler(conn *websocket.Conn) {
	userID := conn.Locals("userID").(string)
	if userID == "" {
		_ = conn.Close()
		return
	}

	client := &Client{
		UserID: userID,
		Conn:   conn,
	}

	GlobalHub.register <- client

	defer func() {
		GlobalHub.unregister <- client
	}()

	for {
		mt, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}

		if mt != websocket.TextMessage {
			continue
		}

		var req WSMessagePayload
		if err := json.Unmarshal(msg, &req); err != nil {
			sendError(client, "Invalid message format")
			continue
		}

		if req.ReceiverUsername == "" {
			sendError(client, "Receiver username is required")
			continue
		}

		if req.Message == "" && req.MediaURL == "" {
			sendError(client, "Cannot send empty message")
			continue
		}

		// Process message persistence and real-time delivery
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		err = handleSendMessage(ctx, client.UserID, req)
		cancel()

		if err != nil {
			sendError(client, err.Error())
		}
	}
}

func sendError(c *Client, errStr string) {
	payload := WSEvent{
		Event: "error",
		Data: fiber.Map{
			"message": errStr,
		},
	}
	data, _ := json.Marshal(payload)
	_ = c.WriteMessage(websocket.TextMessage, data)
}

func handleSendMessage(ctx context.Context, senderID string, req WSMessagePayload) error {
	// Resolve receiver UUID from username
	var receiverID string
	err := database.Pool.QueryRow(ctx,
		"SELECT user_id FROM profiles WHERE username = $1",
		req.ReceiverUsername,
	).Scan(&receiverID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("recipient user does not exist")
		}
		return errors.New("database lookup failed")
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
		return errors.New("failed to save message")
	}

	// Trigger real-time broadcast and notification
	BroadcastMessageEvent(ctx, msgID, senderID, receiverID, req.Message, req.MediaURL, req.MediaType, req.IsPPV, req.Price, createdAt)

	return nil
}

// BroadcastMessageEvent retrieves usernames and delivers messages to both sender & receiver.
func BroadcastMessageEvent(ctx context.Context, msgID, senderID, receiverID, message, mediaURL, mediaType string, isPPV bool, price float64, createdAt time.Time) {
	var senderUsername, receiverUsername string
	_ = database.Pool.QueryRow(ctx, "SELECT username FROM profiles WHERE user_id = $1", senderID).Scan(&senderUsername)
	_ = database.Pool.QueryRow(ctx, "SELECT username FROM profiles WHERE user_id = $1", receiverID).Scan(&receiverUsername)

	timeStr := createdAt.Format("15:04")

	// 1. Broadcast to sender (always unlocked)
	senderEvent := WSEvent{
		Event: "message",
		Data: fiber.Map{
			"id":         msgID,
			"sender":     "user",
			"text":       message,
			"mediaUrl":   mediaURL,
			"mediaType":  mediaType,
			"isPPV":      isPPV,
			"price":      price,
			"isUnlocked": true,
			"time":       timeStr,
		},
	}
	GlobalHub.BroadcastToUser(senderID, senderEvent)

	// 2. Broadcast to receiver (unlocked if not PPV)
	receiverMedia := mediaURL
	if isPPV {
		receiverMedia = ""
	}
	receiverEvent := WSEvent{
		Event: "message",
		Data: fiber.Map{
			"id":         msgID,
			"sender":     senderUsername,
			"text":       message,
			"mediaUrl":   receiverMedia,
			"mediaType":  mediaType,
			"isPPV":      isPPV,
			"price":      price,
			"isUnlocked": !isPPV,
			"time":       timeStr,
		},
	}
	GlobalHub.BroadcastToUser(receiverID, receiverEvent)

	// 3. Send a chat notification to receiver
	notificationEvent := WSEvent{
		Event: "notification",
		Data: fiber.Map{
			"type":            "message",
			"sender_username": senderUsername,
			"text":            message,
		},
	}
	GlobalHub.BroadcastToUser(receiverID, notificationEvent)
}
