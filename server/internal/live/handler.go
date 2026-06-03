package live

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"server/internal/database"
)

type StartStreamRequest struct {
	Title      string  `json:"title"`
	GoalTitle  string  `json:"goal_title"`
	GoalTarget float64 `json:"goal_target"`
}

type CommentRequest struct {
	Text   string  `json:"text"`
	IsTip  bool    `json:"is_tip"`
	Amount float64 `json:"amount"`
}

func GetActiveStream(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var streamID string
	err := database.Pool.QueryRow(ctx,
		`SELECT ls.id::text FROM live_streams ls
		 JOIN profiles p ON ls.creator_id = p.user_id
		 WHERE ls.status = 'live' AND p.hidden = false
		 ORDER BY ls.started_at DESC LIMIT 1`,
	).Scan(&streamID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.JSON(fiber.Map{"stream": nil, "comments": []fiber.Map{}})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load active stream"})
	}

	stream, err := loadStream(ctx, streamID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load live stream"})
	}

	comments, err := loadComments(ctx, streamID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load live comments"})
	}

	return c.JSON(fiber.Map{"stream": stream, "comments": comments})
}

func StartStream(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	userRole, _ := c.Locals("userRole").(string)
	if userRole != "creator" {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Only creators can start a live stream"})
	}

	req := new(StartStreamRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.Title == "" {
		req.Title = "Live Broadcast"
	}
	if req.GoalTitle == "" {
		req.GoalTitle = "Live support goal"
	}
	if req.GoalTarget < 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Goal target cannot be negative"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	tx, err := database.Pool.Begin(ctx)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to start live stream"})
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx,
		`UPDATE live_streams SET status = 'ended', ended_at = NOW()
		 WHERE creator_id = $1 AND status = 'live'`,
		userID,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to close previous stream"})
	}

	var streamID string
	err = tx.QueryRow(ctx,
		`INSERT INTO live_streams (creator_id, title, goal_title, goal_target, viewer_count, heart_count)
		 VALUES ($1, $2, $3, $4, 1, 0)
		 RETURNING id::text`,
		userID, req.Title, req.GoalTitle, req.GoalTarget,
	).Scan(&streamID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create live stream"})
	}
	if err := tx.Commit(ctx); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save live stream"})
	}

	stream, err := loadStream(ctx, streamID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to reload live stream"})
	}
	return c.Status(http.StatusCreated).JSON(fiber.Map{"stream": stream, "comments": []fiber.Map{}})
}

func EndStream(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	streamID := c.Params("id")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	tag, err := database.Pool.Exec(ctx,
		`UPDATE live_streams SET status = 'ended', ended_at = NOW()
		 WHERE id = $1 AND creator_id = $2 AND status = 'live'`,
		streamID, userID,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to end live stream"})
	}
	if tag.RowsAffected() == 0 {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Live stream not found or already ended"})
	}

	return c.JSON(fiber.Map{"message": "Live stream ended"})
}

func AddComment(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	streamID := c.Params("id")

	req := new(CommentRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.Text == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Comment text is required"})
	}
	if req.Amount < 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Tip amount cannot be negative"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var exists bool
	err := database.Pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM live_streams WHERE id = $1 AND status = 'live')`,
		streamID,
	).Scan(&exists)
	if err != nil || !exists {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Active live stream not found"})
	}

	var commentID string
	err = database.Pool.QueryRow(ctx,
		`INSERT INTO live_comments (stream_id, user_id, text, is_tip, amount)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id::text`,
		streamID, userID, req.Text, req.IsTip, req.Amount,
	).Scan(&commentID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save live comment"})
	}

	if req.IsTip && req.Amount > 0 {
		_, _ = database.Pool.Exec(ctx,
			`UPDATE live_streams
			 SET goal_current = goal_current + $1
			 WHERE id = $2`,
			req.Amount, streamID,
		)
	}

	comments, err := loadComments(ctx, streamID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to reload live comments"})
	}
	return c.JSON(fiber.Map{"id": commentID, "comments": comments})
}

func AddReaction(c *fiber.Ctx) error {
	streamID := c.Params("id")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var heartCount int
	err := database.Pool.QueryRow(ctx,
		`UPDATE live_streams
		 SET heart_count = heart_count + 1
		 WHERE id = $1 AND status = 'live'
		 RETURNING heart_count`,
		streamID,
	).Scan(&heartCount)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Active live stream not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save reaction"})
	}

	return c.JSON(fiber.Map{"heart_count": heartCount})
}

func loadStream(ctx context.Context, streamID string) (fiber.Map, error) {
	var id, title, goalTitle, status, creatorID, creatorUsername, creatorName, creatorAvatar string
	var goalTarget, goalCurrent float64
	var viewerCount, heartCount int
	var startedAt time.Time

	err := database.Pool.QueryRow(ctx,
		`SELECT ls.id::text, ls.title, COALESCE(ls.goal_title, ''), ls.goal_target, ls.goal_current,
		        ls.viewer_count, ls.heart_count, ls.status, ls.started_at,
		        p.user_id::text, p.username, p.display_name, COALESCE(p.avatar, '')
		 FROM live_streams ls
		 JOIN profiles p ON ls.creator_id = p.user_id
		 WHERE ls.id = $1`,
		streamID,
	).Scan(&id, &title, &goalTitle, &goalTarget, &goalCurrent, &viewerCount, &heartCount, &status,
		&startedAt, &creatorID, &creatorUsername, &creatorName, &creatorAvatar)
	if err != nil {
		return nil, err
	}

	return fiber.Map{
		"id":               id,
		"title":            title,
		"goal_title":       goalTitle,
		"goal_target":      goalTarget,
		"goal_current":     goalCurrent,
		"viewer_count":     viewerCount,
		"heart_count":      heartCount,
		"status":           status,
		"started_at":       startedAt.Format(time.RFC3339),
		"creator_id":       creatorID,
		"creator_username": creatorUsername,
		"creator_name":     creatorName,
		"creator_avatar":   creatorAvatar,
	}, nil
}

func loadComments(ctx context.Context, streamID string) ([]fiber.Map, error) {
	rows, err := database.Pool.Query(ctx,
		`SELECT lc.id::text, p.display_name, COALESCE(p.avatar, ''), lc.text,
		        lc.is_tip, lc.amount, lc.created_at
		 FROM live_comments lc
		 JOIN profiles p ON lc.user_id = p.user_id
		 WHERE lc.stream_id = $1
		 ORDER BY lc.created_at ASC
		 LIMIT 200`,
		streamID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	comments := []fiber.Map{}
	for rows.Next() {
		var id, name, avatar, text string
		var isTip bool
		var amount float64
		var createdAt time.Time
		if err := rows.Scan(&id, &name, &avatar, &text, &isTip, &amount, &createdAt); err != nil {
			return nil, err
		}
		comments = append(comments, fiber.Map{
			"id":         id,
			"name":       name,
			"avatar":     avatar,
			"text":       text,
			"is_tip":     isTip,
			"amount":     amount,
			"created_at": createdAt.Format(time.RFC3339),
		})
	}
	return comments, rows.Err()
}
