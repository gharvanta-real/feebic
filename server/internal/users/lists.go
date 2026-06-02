package users

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"server/internal/database"
)

type CustomListResponse struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	Usernames []string `json:"usernames"`
}

type CreateListRequest struct {
	Name string `json:"name"`
}

type AddMemberRequest struct {
	Username string `json:"username"`
}

// 1. GET /api/lists - List all custom lists for authenticated creator
func GetCustomLists(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rows, err := database.Pool.Query(ctx,
		`SELECT id, name FROM custom_lists WHERE creator_id = $1 ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to query custom lists"})
	}
	defer rows.Close()

	lists := []CustomListResponse{}
	for rows.Next() {
		var id, name string
		if err := rows.Scan(&id, &name); err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse custom list"})
		}
		lists = append(lists, CustomListResponse{
			ID:        id,
			Name:      name,
			Usernames: []string{},
		})
	}
	rows.Close()

	// Fill usernames for each list
	for i, list := range lists {
		memberRows, err := database.Pool.Query(ctx,
			`SELECT p.username 
			 FROM custom_list_members m
			 JOIN profiles p ON m.user_id = p.user_id
			 WHERE m.list_id = $1
			 ORDER BY m.created_at ASC`,
			list.ID,
		)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to query list members"})
		}

		usernames := []string{}
		for memberRows.Next() {
			var u string
			if err := memberRows.Scan(&u); err == nil {
				usernames = append(usernames, u)
			}
		}
		memberRows.Close()
		lists[i].Usernames = usernames
	}

	return c.JSON(lists)
}

// 2. POST /api/lists - Create a new custom list
func CreateCustomList(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	req := new(CreateListRequest)
	if err := c.BodyParser(req); err != nil || req.Name == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid list name"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var listID string
	err := database.Pool.QueryRow(ctx,
		`INSERT INTO custom_lists (creator_id, name) VALUES ($1, $2) RETURNING id`,
		userID, req.Name,
	).Scan(&listID)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create custom list"})
	}

	return c.JSON(CustomListResponse{
		ID:        listID,
		Name:      req.Name,
		Usernames: []string{},
	})
}

// 3. DELETE /api/lists/:id - Delete a custom list
func DeleteCustomList(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	listID := c.Params("id")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Verify ownership and delete
	cmd, err := database.Pool.Exec(ctx,
		`DELETE FROM custom_lists WHERE id = $1 AND creator_id = $2`,
		listID, userID,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete custom list"})
	}

	if cmd.RowsAffected() == 0 {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Custom list not found or unauthorized"})
	}

	return c.JSON(fiber.Map{"message": "Custom list deleted successfully"})
}

// 4. POST /api/lists/:id/members - Add a user to a custom list
func AddListMember(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	listID := c.Params("id")

	req := new(AddMemberRequest)
	if err := c.BodyParser(req); err != nil || req.Username == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid username"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Verify list ownership
	var exists bool
	err := database.Pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM custom_lists WHERE id = $1 AND creator_id = $2)`,
		listID, userID,
	).Scan(&exists)
	if err != nil || !exists {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Custom list not found or unauthorized"})
	}

	// Look up user ID from username
	var memberID string
	err = database.Pool.QueryRow(ctx,
		`SELECT user_id FROM profiles WHERE username = $1`,
		req.Username,
	).Scan(&memberID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "User profile not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to lookup user"})
	}

	// Add user to custom list members
	_, err = database.Pool.Exec(ctx,
		`INSERT INTO custom_list_members (list_id, user_id) 
		 VALUES ($1, $2) 
		 ON CONFLICT (list_id, user_id) DO NOTHING`,
		listID, memberID,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to add member to list"})
	}

	return c.JSON(fiber.Map{"message": "Member added successfully", "username": req.Username})
}

// 5. DELETE /api/lists/:id/members/:username - Remove user from list
func RemoveListMember(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	listID := c.Params("id")
	username := c.Params("username")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Verify list ownership
	var exists bool
	err := database.Pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM custom_lists WHERE id = $1 AND creator_id = $2)`,
		listID, userID,
	).Scan(&exists)
	if err != nil || !exists {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Custom list not found or unauthorized"})
	}

	// Look up user ID from username
	var memberID string
	err = database.Pool.QueryRow(ctx,
		`SELECT user_id FROM profiles WHERE username = $1`,
		username,
	).Scan(&memberID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "User profile not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to lookup user"})
	}

	// Remove user from custom list members
	cmd, err := database.Pool.Exec(ctx,
		`DELETE FROM custom_list_members WHERE list_id = $1 AND user_id = $2`,
		listID, memberID,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to remove member from list"})
	}

	if cmd.RowsAffected() == 0 {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Member not found in list"})
	}

	return c.JSON(fiber.Map{"message": "Member removed successfully"})
}
