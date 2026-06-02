package posts

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"

	"server/internal/config"
	"server/internal/database"
)

type CreatePostRequest struct {
	Content    string                 `json:"content"`
	MediaUrls  []string               `json:"media_urls"`
	MediaType  string                 `json:"media_type"`
	IsPremium  bool                   `json:"is_premium"`
	Price      float64                `json:"price"`
	Poll       map[string]interface{} `json:"poll"`
	Fundraiser map[string]interface{} `json:"fundraiser"`
}

type CommentRequest struct {
	Text string `json:"text"`
}

type VotePollRequest struct {
	OptionIndex int `json:"option_index"`
}

type FundraiserContributionRequest struct {
	Amount float64 `json:"amount"`
}

type ReportPostRequest struct {
	Reason string `json:"reason"`
}

// 1. Create a new post (Creators only)
func CreatePost(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	userRole := c.Locals("userRole").(string)

	if userRole != "creator" {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Only creators are allowed to publish posts"})
	}

	req := new(CreatePostRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pollJSON, err := jsonOrNil(req.Poll)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid poll payload"})
	}
	fundraiserJSON, err := jsonOrNil(req.Fundraiser)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid fundraiser payload"})
	}

	_, err = database.Pool.Exec(ctx,
		`INSERT INTO posts (creator_id, content, media_urls, media_type, is_premium, price, poll, fundraiser) 
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		userID, req.Content, req.MediaUrls, req.MediaType, req.IsPremium, req.Price, pollJSON, fundraiserJSON,
	)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create post record"})
	}

	return c.Status(http.StatusCreated).JSON(fiber.Map{"message": "Post published successfully"})
}

// 2. Fetch posts feed with optional auth validation
func GetFeed(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Optionally parse authorization header (not required for public posts)
	viewerID := ""
	authHeader := c.Get("Authorization")
	if authHeader != "" {
		parts := strings.Split(authHeader, " ")
		if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
			cfg := config.Load()
			token, err := jwt.Parse(parts[1], func(t *jwt.Token) (interface{}, error) {
				return []byte(cfg.JWTSecret), nil
			})
			if err == nil && token.Valid {
				if claims, ok := token.Claims.(jwt.MapClaims); ok {
					viewerID, _ = claims["user_id"].(string)
				}
			}
		}
	}

	// Retrieve posts joined with creator profiles
	rows, err := database.Pool.Query(ctx,
		`SELECT p.id, p.creator_id, COALESCE(p.content, ''), p.media_urls, COALESCE(p.media_type, ''), 
		        p.is_premium, p.price, COALESCE(p.poll, '{}'::jsonb), COALESCE(p.fundraiser, '{}'::jsonb),
		        COALESCE(p.reposted_from_id::text, ''), p.created_at, pr.username, pr.display_name, COALESCE(pr.avatar, ''),
		        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS likes_count,
		        (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) AS comments_count,
		        CASE WHEN $1::uuid IS NULL THEN FALSE ELSE EXISTS(
		        	SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1::uuid
		        ) END AS is_liked,
		        CASE WHEN $1::uuid IS NULL THEN FALSE ELSE EXISTS(
		        	SELECT 1 FROM post_bookmarks pb WHERE pb.post_id = p.id AND pb.user_id = $1::uuid
		        ) END AS is_bookmarked,
		        CASE WHEN $1::uuid IS NULL THEN FALSE ELSE EXISTS(
		        	SELECT 1 FROM post_unlocks pu WHERE pu.post_id = p.id AND pu.user_id = $1::uuid
		        ) END AS is_unlocked,
		        COALESCE(rp.username, '')
		 FROM posts p
		 JOIN profiles pr ON p.creator_id = pr.user_id
		 LEFT JOIN profiles rp ON p.creator_id = rp.user_id
		 WHERE CASE WHEN $1::uuid IS NULL THEN TRUE ELSE NOT EXISTS(
		 	 SELECT 1 FROM post_reports r WHERE r.post_id = p.id AND r.user_id = $1::uuid
		 ) END
		 ORDER BY p.created_at DESC`,
		nullableUUID(viewerID),
	)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to query database feed"})
	}
	defer rows.Close()

	feed := []fiber.Map{}
	for rows.Next() {
		var postID, creatorID, content, mediaType, username, displayName, avatar, repostedFromID, repostedBy string
		var mediaUrls []string
		var isPremium bool
		var isLiked, isBookmarked, isUnlocked bool
		var price float64
		var likesCount, commentsCount int
		var createdAt time.Time
		var pollRaw, fundraiserRaw []byte

		err := rows.Scan(
			&postID, &creatorID, &content, &mediaUrls, &mediaType,
			&isPremium, &price, &pollRaw, &fundraiserRaw, &repostedFromID, &createdAt, &username, &displayName, &avatar,
			&likesCount, &commentsCount, &isLiked, &isBookmarked, &isUnlocked, &repostedBy,
		)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse post row"})
		}

		// Security Check: Verify subscription gate
		isLocked := false
		if isPremium {
			if viewerID == "" {
				isLocked = true
			} else if viewerID != creatorID && !isUnlocked {
				// Check active subscription status in database
				var subscribed bool
				err := database.Pool.QueryRow(ctx,
					`SELECT EXISTS(
						SELECT 1 FROM subscriptions 
						WHERE fan_id = $1 AND creator_id = $2 AND status = 'active'
					)`,
					viewerID, creatorID,
				).Scan(&subscribed)

				if err != nil {
					subscribed = false
				}

				if !subscribed {
					isLocked = true
				}
			}
		}

		// Anti-Piracy: Nullify links if locked
		outputMedia := mediaUrls
		if isLocked {
			outputMedia = []string{}
		}

		poll := decodePostPoll(pollRaw, viewerID)
		fundraiser := decodeJSONMap(fundraiserRaw)

		feed = append(feed, fiber.Map{
			"id":               postID,
			"creator_id":       creatorID,
			"content":          content,
			"media_urls":       outputMedia,
			"media_type":       mediaType,
			"is_premium":       isPremium,
			"price":            price,
			"is_locked":        isLocked,
			"created_at":       createdAt.Format(time.RFC3339),
			"creator_username": username,
			"creator_name":     displayName,
			"creator_avatar":   avatar,
			"likes":            likesCount,
			"comments_count":   commentsCount,
			"is_liked":         isLiked,
			"is_bookmarked":    isBookmarked,
			"is_unlocked":      isUnlocked,
			"poll":             poll,
			"fundraiser":       fundraiser,
			"reposted_from_id": emptyStringToNil(repostedFromID),
			"reposted_by":      emptyStringToNil(repostedBy),
		})
	}

	return c.JSON(feed)
}

func nullableUUID(id string) interface{} {
	if id == "" {
		return nil
	}
	return id
}

func jsonOrNil(value map[string]interface{}) (interface{}, error) {
	if len(value) == 0 {
		return nil, nil
	}
	bytes, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	return string(bytes), nil
}

func decodeJSONMap(raw []byte) interface{} {
	if len(raw) == 0 || string(raw) == "{}" {
		return nil
	}
	var value map[string]interface{}
	if err := json.Unmarshal(raw, &value); err != nil || len(value) == 0 {
		return nil
	}
	return value
}

func decodePostPoll(raw []byte, viewerID string) interface{} {
	value := decodeJSONMap(raw)
	poll, ok := value.(map[string]interface{})
	if !ok {
		return value
	}

	if votedBy, ok := poll["votedBy"].(map[string]interface{}); ok {
		if viewerID != "" {
			if voted, exists := votedBy[viewerID]; exists {
				poll["votedOptionIndex"] = voted
			}
		}
		delete(poll, "votedBy")
	}

	return poll
}

func emptyStringToNil(value string) interface{} {
	if value == "" || value == "<nil>" {
		return nil
	}
	return value
}

func ToggleLike(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	postID := c.Params("id")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	tx, err := database.Pool.Begin(ctx)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to start like update"})
	}
	defer tx.Rollback(ctx)

	var exists bool
	err = tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2)", postID, userID).Scan(&exists)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to check like state"})
	}

	if exists {
		_, err = tx.Exec(ctx, "DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2", postID, userID)
	} else {
		_, err = tx.Exec(ctx, "INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)", postID, userID)
	}
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update like state"})
	}

	var likesCount int
	err = tx.QueryRow(ctx, "SELECT COUNT(*) FROM post_likes WHERE post_id = $1", postID).Scan(&likesCount)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count likes"})
	}

	if err := tx.Commit(ctx); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save like update"})
	}

	return c.JSON(fiber.Map{"is_liked": !exists, "likes": likesCount})
}

func ToggleBookmark(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	postID := c.Params("id")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var exists bool
	err := database.Pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM post_bookmarks WHERE post_id = $1 AND user_id = $2)", postID, userID).Scan(&exists)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to check bookmark state"})
	}

	if exists {
		_, err = database.Pool.Exec(ctx, "DELETE FROM post_bookmarks WHERE post_id = $1 AND user_id = $2", postID, userID)
	} else {
		_, err = database.Pool.Exec(ctx, "INSERT INTO post_bookmarks (post_id, user_id) VALUES ($1, $2)", postID, userID)
	}
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update bookmark state"})
	}

	return c.JSON(fiber.Map{"is_bookmarked": !exists})
}

func GetComments(c *fiber.Ctx) error {
	postID := c.Params("id")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rows, err := database.Pool.Query(ctx,
		`SELECT pc.id, pc.text, pc.created_at, p.username, p.display_name, COALESCE(p.avatar, '')
		 FROM post_comments pc
		 JOIN profiles p ON pc.user_id = p.user_id
		 WHERE pc.post_id = $1
		 ORDER BY pc.created_at ASC`,
		postID,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch comments"})
	}
	defer rows.Close()

	comments := []fiber.Map{}
	for rows.Next() {
		var id, text, username, displayName, avatar string
		var createdAt time.Time
		if err := rows.Scan(&id, &text, &createdAt, &username, &displayName, &avatar); err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse comment"})
		}
		comments = append(comments, fiber.Map{
			"id":         id,
			"text":       text,
			"username":   username,
			"name":       displayName,
			"avatar":     avatar,
			"time":       createdAt.Format(time.RFC3339),
			"created_at": createdAt.Format(time.RFC3339),
		})
	}

	return c.JSON(comments)
}

func AddComment(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	postID := c.Params("id")

	req := new(CommentRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	req.Text = strings.TrimSpace(req.Text)
	if req.Text == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Comment cannot be empty"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	tx, err := database.Pool.Begin(ctx)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to start comment update"})
	}
	defer tx.Rollback(ctx)

	var commentID string
	var createdAt time.Time
	err = tx.QueryRow(ctx,
		`INSERT INTO post_comments (post_id, user_id, text)
		 VALUES ($1, $2, $3)
		 RETURNING id, created_at`,
		postID, userID, req.Text,
	).Scan(&commentID, &createdAt)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save comment"})
	}

	var username, displayName, avatar string
	err = tx.QueryRow(ctx,
		"SELECT username, display_name, COALESCE(avatar, '') FROM profiles WHERE user_id = $1",
		userID,
	).Scan(&username, &displayName, &avatar)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load commenter profile"})
	}

	var commentsCount int
	err = tx.QueryRow(ctx, "SELECT COUNT(*) FROM post_comments WHERE post_id = $1", postID).Scan(&commentsCount)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count comments"})
	}

	if err := tx.Commit(ctx); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save comment update"})
	}

	return c.Status(http.StatusCreated).JSON(fiber.Map{
		"comment": fiber.Map{
			"id":         commentID,
			"text":       req.Text,
			"username":   username,
			"name":       displayName,
			"avatar":     avatar,
			"time":       createdAt.Format(time.RFC3339),
			"created_at": createdAt.Format(time.RFC3339),
		},
		"comments_count": commentsCount,
	})
}

func UnlockPost(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	postID := c.Params("id")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var creatorID, creatorUsername string
	var price float64
	err := database.Pool.QueryRow(ctx,
		`SELECT p.creator_id::text, pr.username, p.price
		 FROM posts p
		 JOIN profiles pr ON p.creator_id = pr.user_id
		 WHERE p.id = $1 AND p.is_premium = TRUE AND p.price > 0`,
		postID,
	).Scan(&creatorID, &creatorUsername, &price)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Paid post does not exist"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load paid post"})
	}
	if creatorID == userID {
		return c.JSON(fiber.Map{"is_unlocked": true, "balance": 0})
	}

	var alreadyUnlocked bool
	err = database.Pool.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM post_unlocks WHERE post_id = $1 AND user_id = $2)",
		postID, userID,
	).Scan(&alreadyUnlocked)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to check unlock state"})
	}
	if alreadyUnlocked {
		balance, _ := getWalletBalance(ctx, userID)
		return c.JSON(fiber.Map{"is_unlocked": true, "balance": balance})
	}

	balance, err := getWalletBalance(ctx, userID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Balance check failed"})
	}
	if balance < price {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Insufficient wallet balance to unlock post"})
	}

	tx, err := database.Pool.Begin(ctx)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to start unlock transaction"})
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx,
		"INSERT INTO transactions (user_id, amount, type, title) VALUES ($1, $2, 'unlock', $3)",
		userID, -price, "Unlock post from @"+creatorUsername,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to debit wallet"})
	}

	_, err = tx.Exec(ctx,
		"INSERT INTO transactions (user_id, amount, type, title) VALUES ($1, $2, 'unlock', $3)",
		creatorID, price, "Paid post unlock",
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to credit creator wallet"})
	}

	_, err = tx.Exec(ctx,
		"INSERT INTO post_unlocks (post_id, user_id, amount) VALUES ($1, $2, $3)",
		postID, userID, price,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to record unlock"})
	}

	_, err = tx.Exec(ctx,
		"INSERT INTO notifications (user_id, sender_id, type, text, amount) VALUES ($1, $2, 'unlock', 'unlocked your paid post', $3)",
		creatorID, userID, price,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to notify creator"})
	}

	if err := tx.Commit(ctx); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save unlock"})
	}

	newBalance, _ := getWalletBalance(ctx, userID)
	return c.JSON(fiber.Map{"is_unlocked": true, "balance": newBalance})
}

func VotePoll(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	postID := c.Params("id")

	req := new(VotePollRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var raw []byte
	err := database.Pool.QueryRow(ctx, "SELECT poll FROM posts WHERE id = $1 AND poll IS NOT NULL", postID).Scan(&raw)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Poll post does not exist"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load poll"})
	}

	var poll struct {
		Question string `json:"question"`
		Options  []struct {
			Text  string  `json:"text"`
			Votes float64 `json:"votes"`
		} `json:"options"`
		VotedBy map[string]int `json:"votedBy,omitempty"`
	}
	if err := json.Unmarshal(raw, &poll); err != nil || req.OptionIndex < 0 || req.OptionIndex >= len(poll.Options) {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid poll option"})
	}
	if poll.VotedBy == nil {
		poll.VotedBy = map[string]int{}
	}
	if _, exists := poll.VotedBy[userID]; exists {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "You have already voted on this poll"})
	}

	poll.Options[req.OptionIndex].Votes++
	poll.VotedBy[userID] = req.OptionIndex
	nextPoll, _ := json.Marshal(poll)

	_, err = database.Pool.Exec(ctx, "UPDATE posts SET poll = $1 WHERE id = $2", string(nextPoll), postID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to record vote"})
	}

	var output map[string]interface{}
	_ = json.Unmarshal(nextPoll, &output)
	output["votedOptionIndex"] = req.OptionIndex
	delete(output, "votedBy")
	return c.JSON(fiber.Map{"poll": output})
}

func ContributeFundraiser(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	postID := c.Params("id")

	req := new(FundraiserContributionRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.Amount <= 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Contribution amount must be greater than zero"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var creatorID, creatorUsername string
	var raw []byte
	err := database.Pool.QueryRow(ctx,
		`SELECT p.creator_id::text, pr.username, p.fundraiser
		 FROM posts p
		 JOIN profiles pr ON p.creator_id = pr.user_id
		 WHERE p.id = $1 AND p.fundraiser IS NOT NULL`,
		postID,
	).Scan(&creatorID, &creatorUsername, &raw)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Fundraiser post does not exist"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load fundraiser"})
	}

	balance, err := getWalletBalance(ctx, userID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Balance check failed"})
	}
	if balance < req.Amount {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Insufficient wallet balance to contribute"})
	}

	var fundraiser map[string]interface{}
	if err := json.Unmarshal(raw, &fundraiser); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse fundraiser"})
	}
	current, _ := fundraiser["current"].(float64)
	fundraiser["current"] = current + req.Amount
	nextFundraiser, _ := json.Marshal(fundraiser)

	tx, err := database.Pool.Begin(ctx)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to start contribution transaction"})
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx,
		"INSERT INTO transactions (user_id, amount, type, title) VALUES ($1, $2, 'fundraiser', $3)",
		userID, -req.Amount, "Contribution to @"+creatorUsername,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to debit wallet"})
	}
	_, err = tx.Exec(ctx,
		"INSERT INTO transactions (user_id, amount, type, title) VALUES ($1, $2, 'fundraiser', $3)",
		creatorID, req.Amount, "Fundraiser contribution",
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to credit creator wallet"})
	}
	_, err = tx.Exec(ctx, "UPDATE posts SET fundraiser = $1 WHERE id = $2", string(nextFundraiser), postID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update fundraiser"})
	}
	_, err = tx.Exec(ctx,
		"INSERT INTO notifications (user_id, sender_id, type, text, amount) VALUES ($1, $2, 'fundraiser', 'contributed to your fundraiser', $3)",
		creatorID, userID, req.Amount,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to notify creator"})
	}
	if err := tx.Commit(ctx); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save contribution"})
	}

	newBalance, _ := getWalletBalance(ctx, userID)
	return c.JSON(fiber.Map{"fundraiser": fundraiser, "balance": newBalance})
}

func RepostPost(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	postID := c.Params("id")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var originalCreatorID string
	err := database.Pool.QueryRow(ctx, "SELECT creator_id::text FROM posts WHERE id = $1", postID).Scan(&originalCreatorID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Post does not exist"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load post"})
	}

	var existingID string
	err = database.Pool.QueryRow(ctx,
		"SELECT id::text FROM posts WHERE creator_id = $1 AND reposted_from_id = $2 LIMIT 1",
		userID, postID,
	).Scan(&existingID)
	if err == nil {
		return c.JSON(fiber.Map{"id": existingID, "message": "Already reposted"})
	}

	var newID string
	err = database.Pool.QueryRow(ctx,
		`INSERT INTO posts (creator_id, content, media_urls, media_type, is_premium, price, reposted_from_id)
		 SELECT $1, content, media_urls, media_type, is_premium, price, id
		 FROM posts WHERE id = $2
		 RETURNING id::text`,
		userID, postID,
	).Scan(&newID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to repost"})
	}

	if originalCreatorID != userID {
		_, _ = database.Pool.Exec(ctx,
			"INSERT INTO notifications (user_id, sender_id, type, text) VALUES ($1, $2, 'repost', 'reposted your post')",
			originalCreatorID, userID,
		)
	}

	return c.Status(http.StatusCreated).JSON(fiber.Map{"id": newID, "message": "Post reposted"})
}

func ReportPost(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	postID := c.Params("id")

	req := new(ReportPostRequest)
	_ = c.BodyParser(req)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := database.Pool.Exec(ctx,
		`INSERT INTO post_reports (post_id, user_id, reason)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (post_id, user_id) DO UPDATE SET reason = EXCLUDED.reason`,
		postID, userID, strings.TrimSpace(req.Reason),
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to report post"})
	}

	return c.JSON(fiber.Map{"message": "Post reported"})
}

func DeletePost(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	postID := c.Params("id")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cmd, err := database.Pool.Exec(ctx,
		"DELETE FROM posts WHERE id = $1 AND creator_id = $2",
		postID, userID,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete post"})
	}
	if cmd.RowsAffected() == 0 {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Only the post owner can delete this post"})
	}

	return c.JSON(fiber.Map{"message": "Post deleted"})
}

func getWalletBalance(ctx context.Context, userID string) (float64, error) {
	var balance float64
	err := database.Pool.QueryRow(ctx,
		"SELECT COALESCE(SUM(amount), 0.00) FROM transactions WHERE user_id = $1",
		userID,
	).Scan(&balance)
	return balance, err
}

// GetBookmarks retrieves only the bookmarked posts of the viewer
func GetBookmarks(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Retrieve bookmarked posts joined with creator profiles
	rows, err := database.Pool.Query(ctx,
		`SELECT p.id, p.creator_id, COALESCE(p.content, ''), p.media_urls, COALESCE(p.media_type, ''), 
		        p.is_premium, p.price, COALESCE(p.poll, '{}'::jsonb), COALESCE(p.fundraiser, '{}'::jsonb),
		        COALESCE(p.reposted_from_id::text, ''), p.created_at, pr.username, pr.display_name, COALESCE(pr.avatar, ''),
		        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS likes_count,
		        (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) AS comments_count,
		        CASE WHEN $1::uuid IS NULL THEN FALSE ELSE EXISTS(
		        	SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1::uuid
		        ) END AS is_liked,
		        TRUE AS is_bookmarked,
		        CASE WHEN $1::uuid IS NULL THEN FALSE ELSE EXISTS(
		        	SELECT 1 FROM post_unlocks pu WHERE pu.post_id = p.id AND pu.user_id = $1::uuid
		        ) END AS is_unlocked,
		        COALESCE(rp.username, '')
		 FROM posts p
		 JOIN profiles pr ON p.creator_id = pr.user_id
		 LEFT JOIN profiles rp ON p.creator_id = rp.user_id
		 JOIN post_bookmarks pb ON p.id = pb.post_id AND pb.user_id = $1::uuid
		 WHERE CASE WHEN $1::uuid IS NULL THEN TRUE ELSE NOT EXISTS(
		 	 SELECT 1 FROM post_reports r WHERE r.post_id = p.id AND r.user_id = $1::uuid
		 ) END
		 ORDER BY pb.created_at DESC`,
		userID,
	)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to query database bookmarks"})
	}
	defer rows.Close()

	feed := []fiber.Map{}
	for rows.Next() {
		var postID, creatorID, content, mediaType, username, displayName, avatar, repostedFromID, repostedBy string
		var mediaUrls []string
		var isPremium bool
		var isLiked, isBookmarked, isUnlocked bool
		var price float64
		var likesCount, commentsCount int
		var createdAt time.Time
		var pollRaw, fundraiserRaw []byte

		err := rows.Scan(
			&postID, &creatorID, &content, &mediaUrls, &mediaType,
			&isPremium, &price, &pollRaw, &fundraiserRaw, &repostedFromID, &createdAt, &username, &displayName, &avatar,
			&likesCount, &commentsCount, &isLiked, &isBookmarked, &isUnlocked, &repostedBy,
		)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse post row"})
		}

		// Security Check: Verify subscription gate
		isLocked := false
		if isPremium {
			if userID != creatorID && !isUnlocked {
				// Check active subscription status in database
				var subscribed bool
				err := database.Pool.QueryRow(ctx,
					`SELECT EXISTS(
						SELECT 1 FROM subscriptions 
						WHERE fan_id = $1 AND creator_id = $2 AND status = 'active'
					)`,
					userID, creatorID,
				).Scan(&subscribed)

				if err != nil {
					subscribed = false
				}

				if !subscribed {
					isLocked = true
				}
			}
		}

		// Anti-Piracy: Nullify links if locked
		outputMedia := mediaUrls
		if isLocked {
			outputMedia = []string{}
		}

		poll := decodePostPoll(pollRaw, userID)
		fundraiser := decodeJSONMap(fundraiserRaw)

		feed = append(feed, fiber.Map{
			"id":               postID,
			"creator_id":       creatorID,
			"content":          content,
			"media_urls":       outputMedia,
			"media_type":       mediaType,
			"is_premium":       isPremium,
			"price":            price,
			"is_locked":        isLocked,
			"created_at":       createdAt.Format(time.RFC3339),
			"creator_username": username,
			"creator_name":     displayName,
			"creator_avatar":   avatar,
			"likes":            likesCount,
			"comments_count":   commentsCount,
			"is_liked":         isLiked,
			"is_bookmarked":    isBookmarked,
			"is_unlocked":      isUnlocked,
			"poll":             poll,
			"fundraiser":       fundraiser,
			"reposted_from_id": emptyStringToNil(repostedFromID),
			"reposted_by":      emptyStringToNil(repostedBy),
		})
	}

	return c.JSON(feed)
}

