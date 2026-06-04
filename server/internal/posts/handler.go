package posts

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"

	"server/internal/config"
	"server/internal/database"
)

type CreatePostRequest struct {
	Content      string                 `json:"content"`
	MediaUrls    []string               `json:"media_urls"`
	MediaType    string                 `json:"media_type"`
	IsPremium    bool                   `json:"is_premium"`
	Price        float64                `json:"price"`
	Poll         map[string]interface{} `json:"poll"`
	Fundraiser   map[string]interface{} `json:"fundraiser"`
	TeaserUrl    string                 `json:"teaser_url"`
	PublishAt    string                 `json:"publish_at"`
	TargetListID string                 `json:"target_list_id"`
	Status       string                 `json:"status"`
	Visibility   string                 `json:"visibility"`
}

type UpdatePostRequest struct {
	Content    *string  `json:"content"`
	IsPremium  *bool    `json:"is_premium"`
	Price      *float64 `json:"price"`
	Status     string   `json:"status"`
	Visibility string   `json:"visibility"`
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

	var publishAt *time.Time
	if req.PublishAt != "" {
		if t, err := time.Parse(time.RFC3339, req.PublishAt); err == nil {
			publishAt = &t
		} else if t, err := time.Parse("2006-01-02T15:04", req.PublishAt); err == nil {
			publishAt = &t
		}
	}

	var targetListID *string
	if req.TargetListID != "" {
		targetListID = &req.TargetListID
	}

	status := normalizePostStatus(req.Status)
	visibility := normalizePostVisibility(req.Visibility)

	var teaserUrl *string
	if req.TeaserUrl != "" {
		teaserUrl = &req.TeaserUrl
	}

	_, err = database.Pool.Exec(ctx,
		`INSERT INTO posts (creator_id, content, media_urls, media_type, is_premium, price, poll, fundraiser, publish_at, teaser_url, target_list_id, status, visibility) 
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
		userID, req.Content, req.MediaUrls, req.MediaType, req.IsPremium, req.Price, pollJSON, fundraiserJSON, publishAt, teaserUrl, targetListID, status, visibility,
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
	var rows pgx.Rows
	var err error
	usernameFilter := c.Query("username")
	page := boundedQueryInt(c, "page", 1, 1, 100000)
	limit := boundedQueryInt(c, "limit", 10, 1, 30)
	offset := (page - 1) * limit
	sortMode := strings.ToLower(c.Query("sort", "organic"))
	orderBy := "p.created_at DESC"
	if usernameFilter == "" && sortMode != "latest" {
		if scoreErr := refreshFeedScores(ctx); scoreErr == nil {
			orderBy = `(COALESCE(fs.score, 0) + 
			   CASE WHEN $1::uuid IS NULL THEN 0.0 ELSE 
			      COALESCE((SELECT (ui.interests->>COALESCE(p.category, 'Lifestyle'))::numeric FROM user_interests ui WHERE ui.user_id = $1::uuid), 0.0) * 8.0 +
			      CASE WHEN EXISTS(
			         SELECT 1 FROM subscriptions s
			         WHERE s.fan_id = $1::uuid AND s.creator_id = p.creator_id AND s.status = 'active' AND s.expires_at > NOW()
			      ) THEN 18.0 ELSE 0.0 END
			   END) DESC, p.created_at DESC`
		}
	}
	if usernameFilter != "" {
		rows, err = database.Pool.Query(ctx,
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
			        COALESCE(rp.username, ''),
			        p.publish_at, COALESCE(p.teaser_url, ''), COALESCE(p.target_list_id::text, ''),
			        COALESCE(p.status, 'published'), COALESCE(p.visibility, 'public'),
			        COALESCE(p.category, 'Lifestyle')
			 FROM posts p
			 JOIN profiles pr ON p.creator_id = pr.user_id
			 LEFT JOIN profiles rp ON p.creator_id = rp.user_id
			 WHERE (CASE WHEN $1::uuid IS NULL THEN TRUE ELSE NOT EXISTS(
			 	 SELECT 1 FROM post_reports r WHERE r.post_id = p.id AND r.user_id = $1::uuid
			 ) END)
			   AND COALESCE(p.status, 'published') = 'published'
			   AND (p.publish_at IS NULL OR p.publish_at <= NOW() OR p.creator_id = $1::uuid)
			   AND (p.target_list_id IS NULL OR p.creator_id = $1::uuid OR CASE WHEN $1::uuid IS NULL THEN FALSE ELSE EXISTS(
			      SELECT 1 FROM custom_list_members clm 
			      WHERE clm.list_id = p.target_list_id AND clm.user_id = $1::uuid
			   ) END)
			   AND (
			      COALESCE(p.visibility, 'public') = 'public'
			      OR p.creator_id = $1::uuid
			      OR (COALESCE(p.visibility, 'public') = 'subscribers' AND CASE WHEN $1::uuid IS NULL THEN FALSE ELSE EXISTS(
			         SELECT 1 FROM subscriptions s
			         WHERE s.fan_id = $1::uuid AND s.creator_id = p.creator_id AND s.status = 'active' AND s.expires_at > NOW()
			      ) END)
			   )
			   AND pr.username = $2 AND pr.hidden = false
			 ORDER BY p.created_at DESC
			 LIMIT $3 OFFSET $4`,
			nullableUUID(viewerID), usernameFilter, limit, offset,
		)
	} else {
		rows, err = database.Pool.Query(ctx,
			fmt.Sprintf(`SELECT p.id, p.creator_id, COALESCE(p.content, ''), p.media_urls, COALESCE(p.media_type, ''), 
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
			        COALESCE(rp.username, ''),
			        p.publish_at, COALESCE(p.teaser_url, ''), COALESCE(p.target_list_id::text, ''),
			        COALESCE(p.status, 'published'), COALESCE(p.visibility, 'public'),
			        COALESCE(p.category, 'Lifestyle')
			 FROM posts p
			 JOIN profiles pr ON p.creator_id = pr.user_id
			 LEFT JOIN profiles rp ON p.creator_id = rp.user_id
			 LEFT JOIN feed_scores fs ON fs.post_id = p.id
			 WHERE (CASE WHEN $1::uuid IS NULL THEN TRUE ELSE NOT EXISTS(
			 	 SELECT 1 FROM post_reports r WHERE r.post_id = p.id AND r.user_id = $1::uuid
			 ) END)
			   AND COALESCE(p.status, 'published') = 'published'
			   AND (p.publish_at IS NULL OR p.publish_at <= NOW() OR p.creator_id = $1::uuid)
			   AND (p.target_list_id IS NULL OR p.creator_id = $1::uuid OR CASE WHEN $1::uuid IS NULL THEN FALSE ELSE EXISTS(
			      SELECT 1 FROM custom_list_members clm 
			      WHERE clm.list_id = p.target_list_id AND clm.user_id = $1::uuid
			   ) END)
			   AND (
			      COALESCE(p.visibility, 'public') = 'public'
			      OR p.creator_id = $1::uuid
			      OR (COALESCE(p.visibility, 'public') = 'subscribers' AND CASE WHEN $1::uuid IS NULL THEN FALSE ELSE EXISTS(
			         SELECT 1 FROM subscriptions s
			         WHERE s.fan_id = $1::uuid AND s.creator_id = p.creator_id AND s.status = 'active' AND s.expires_at > NOW()
			      ) END)
			   )
			   AND pr.hidden = false
			 ORDER BY %s
			 LIMIT $2 OFFSET $3`, orderBy),
			nullableUUID(viewerID), limit, offset,
		)
	}

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
		var publishAt *time.Time
		var teaserUrl, targetListID, status, visibility, category string

		err := rows.Scan(
			&postID, &creatorID, &content, &mediaUrls, &mediaType,
			&isPremium, &price, &pollRaw, &fundraiserRaw, &repostedFromID, &createdAt, &username, &displayName, &avatar,
			&likesCount, &commentsCount, &isLiked, &isBookmarked, &isUnlocked, &repostedBy,
			&publishAt, &teaserUrl, &targetListID, &status, &visibility, &category,
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

		var publishAtStr interface{} = nil
		if publishAt != nil {
			publishAtStr = publishAt.Format(time.RFC3339)
		}

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
			"publish_at":       publishAtStr,
			"teaser_url":       emptyStringToNil(teaserUrl),
			"target_list_id":   emptyStringToNil(targetListID),
			"status":           status,
			"visibility":       visibility,
			"category":         category,
		})
	}

	return c.JSON(feed)
}

func GetMyPosts(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	userRole := c.Locals("userRole").(string)
	if userRole != "creator" {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Only creators can manage posts"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	page := boundedQueryInt(c, "page", 1, 1, 100000)
	limit := boundedQueryInt(c, "limit", 20, 1, 50)
	offset := (page - 1) * limit

	rows, err := database.Pool.Query(ctx,
		`SELECT p.id, p.creator_id, COALESCE(p.content, ''), p.media_urls, COALESCE(p.media_type, ''),
		        p.is_premium, p.price, COALESCE(p.poll, '{}'::jsonb), COALESCE(p.fundraiser, '{}'::jsonb),
		        COALESCE(p.reposted_from_id::text, ''), p.created_at, pr.username, pr.display_name, COALESCE(pr.avatar, ''),
		        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS likes_count,
		        (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) AS comments_count,
		        (SELECT COUNT(*) FROM post_unlocks pu WHERE pu.post_id = p.id) AS unlocks_count,
		        p.publish_at, COALESCE(p.teaser_url, ''), COALESCE(p.target_list_id::text, ''),
		        COALESCE(p.status, 'published'), COALESCE(p.visibility, 'public'),
		        COALESCE(p.category, 'Lifestyle')
		 FROM posts p
		 JOIN profiles pr ON p.creator_id = pr.user_id
		 WHERE p.creator_id = $1
		 ORDER BY p.created_at DESC
		 LIMIT $2 OFFSET $3`,
		userID, limit, offset,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to query creator posts"})
	}
	defer rows.Close()

	posts := []fiber.Map{}
	for rows.Next() {
		var postID, creatorID, content, mediaType, username, displayName, avatar, repostedFromID string
		var mediaUrls []string
		var isPremium bool
		var price float64
		var likesCount, commentsCount, unlocksCount int
		var createdAt time.Time
		var pollRaw, fundraiserRaw []byte
		var publishAt *time.Time
		var teaserUrl, targetListID, status, visibility, category string

		if err := rows.Scan(
			&postID, &creatorID, &content, &mediaUrls, &mediaType,
			&isPremium, &price, &pollRaw, &fundraiserRaw, &repostedFromID, &createdAt, &username, &displayName, &avatar,
			&likesCount, &commentsCount, &unlocksCount, &publishAt, &teaserUrl, &targetListID, &status, &visibility, &category,
		); err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse creator post row"})
		}

		var publishAtStr interface{} = nil
		if publishAt != nil {
			publishAtStr = publishAt.Format(time.RFC3339)
		}

		posts = append(posts, fiber.Map{
			"id":               postID,
			"creator_id":       creatorID,
			"content":          content,
			"media_urls":       mediaUrls,
			"media_type":       mediaType,
			"is_premium":       isPremium,
			"price":            price,
			"is_locked":        false,
			"created_at":       createdAt.Format(time.RFC3339),
			"creator_username": username,
			"creator_name":     displayName,
			"creator_avatar":   avatar,
			"likes":            likesCount,
			"comments_count":   commentsCount,
			"unlocks_count":    unlocksCount,
			"is_liked":         false,
			"is_bookmarked":    false,
			"is_unlocked":      true,
			"poll":             decodeJSONMap(pollRaw),
			"fundraiser":       decodeJSONMap(fundraiserRaw),
			"reposted_from_id": emptyStringToNil(repostedFromID),
			"publish_at":       publishAtStr,
			"teaser_url":       emptyStringToNil(teaserUrl),
			"target_list_id":   emptyStringToNil(targetListID),
			"status":           status,
			"visibility":       visibility,
			"category":         category,
		})
	}

	return c.JSON(posts)
}

func UpdatePost(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	userRole := c.Locals("userRole").(string)
	if userRole != "creator" {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Only creators can edit posts"})
	}

	req := new(UpdatePostRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	var status *string
	if req.Status != "" {
		value := normalizePostStatus(req.Status)
		status = &value
	}
	var visibility *string
	if req.Visibility != "" {
		value := normalizePostVisibility(req.Visibility)
		visibility = &value
	}
	var archivedAt interface{} = nil
	if status != nil && *status == "archived" {
		archivedAt = time.Now()
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var postID string
	err := database.Pool.QueryRow(ctx,
		`UPDATE posts
		 SET content = COALESCE($3, content),
		     is_premium = COALESCE($4, is_premium),
		     price = COALESCE($5, price),
		     status = COALESCE($6, status),
		     visibility = COALESCE($7, visibility),
		     archived_at = CASE
		       WHEN $6::text = 'archived' THEN COALESCE($8, NOW())
		       WHEN $6::text IN ('published', 'hidden') THEN NULL
		       ELSE archived_at
		     END,
		     updated_at = NOW()
		 WHERE id = $1 AND creator_id = $2
		 RETURNING id::text`,
		c.Params("id"), userID, req.Content, req.IsPremium, req.Price, status, visibility, archivedAt,
	).Scan(&postID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Post not found or not owned by you"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update post"})
	}

	return c.JSON(fiber.Map{"id": postID, "message": "Post updated"})
}

func refreshFeedScores(ctx context.Context) error {
	_, err := database.Pool.Exec(ctx,
		`WITH components AS (
		   SELECT p.id AS post_id,
		          (GREATEST(0, 120 - EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600.0) * 0.35) AS recency_score,
		          ((SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) * 2.0) AS likes_score,
		          ((SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) * 3.0) AS comments_score,
		          ((SELECT COUNT(*) FROM post_unlocks pu WHERE pu.post_id = p.id) * 6.0) AS unlocks_score,
		          ((SELECT COUNT(*) FROM subscriptions s WHERE s.creator_id = p.creator_id AND s.status = 'active' AND s.expires_at > NOW()) * 0.25) AS creator_quality_score,
		          ((SELECT COUNT(*) FROM post_reports pr WHERE pr.post_id = p.id) * -20.0) AS reports_penalty
		   FROM posts p
		   WHERE COALESCE(p.status, 'published') = 'published'
		 )
		 INSERT INTO feed_scores (post_id, score, recency_score, likes_score, comments_score, unlocks_score, creator_quality_score, reports_penalty, updated_at)
		 SELECT post_id,
		        recency_score + likes_score + comments_score + unlocks_score + creator_quality_score + reports_penalty,
		        recency_score, likes_score, comments_score, unlocks_score, creator_quality_score, reports_penalty, NOW()
		 FROM components
		 ON CONFLICT (post_id) DO UPDATE SET
		     score = EXCLUDED.score,
		     recency_score = EXCLUDED.recency_score,
		     likes_score = EXCLUDED.likes_score,
		     comments_score = EXCLUDED.comments_score,
		     unlocks_score = EXCLUDED.unlocks_score,
		     creator_quality_score = EXCLUDED.creator_quality_score,
		     reports_penalty = EXCLUDED.reports_penalty,
		     updated_at = NOW()`,
	)
	return err
}

func normalizePostStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "hidden", "hide":
		return "hidden"
	case "archived", "archive":
		return "archived"
	default:
		return "published"
	}
}

func normalizePostVisibility(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "subscribers", "subscriber":
		return "subscribers"
	case "private", "only_me":
		return "private"
	default:
		return "public"
	}
}

func boundedQueryInt(c *fiber.Ctx, name string, fallback, min, max int) int {
	value, err := strconv.Atoi(c.Query(name))
	if err != nil {
		return fallback
	}
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
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
		        COALESCE(rp.username, ''),
		        p.publish_at, COALESCE(p.teaser_url, ''), COALESCE(p.target_list_id::text, ''),
		        COALESCE(p.category, 'Lifestyle')
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
		var publishAt *time.Time
		var teaserUrl, targetListID, category string

		err := rows.Scan(
			&postID, &creatorID, &content, &mediaUrls, &mediaType,
			&isPremium, &price, &pollRaw, &fundraiserRaw, &repostedFromID, &createdAt, &username, &displayName, &avatar,
			&likesCount, &commentsCount, &isLiked, &isBookmarked, &isUnlocked, &repostedBy,
			&publishAt, &teaserUrl, &targetListID, &category,
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

		var publishAtStr interface{} = nil
		if publishAt != nil {
			publishAtStr = publishAt.Format(time.RFC3339)
		}

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
			"publish_at":       publishAtStr,
			"teaser_url":       emptyStringToNil(teaserUrl),
			"target_list_id":   emptyStringToNil(targetListID),
			"category":         category,
		})
	}

	return c.JSON(feed)
}

func minFloat(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

type RecordInteractionRequest struct {
	PostID           string `json:"postId"`
	CreatorID        string `json:"creatorId"`
	InteractionType  string `json:"interactionType"`
	DwellTimeSeconds int    `json:"dwellTime"`
	Category         string `json:"category"`
}

func RecordInteraction(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	req := new(RecordInteractionRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.InteractionType == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Interaction type is required"})
	}

	// 1. Strict Input Sanitization & Validation
	validTypes := map[string]bool{
		"view":     true,
		"click":    true,
		"like":     true,
		"bookmark": true,
		"unlock":   true,
		"comment":  true,
	}
	interactionTypeClean := strings.ToLower(strings.TrimSpace(req.InteractionType))
	if !validTypes[interactionTypeClean] {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid interaction type"})
	}

	validCategories := map[string]bool{
		"Lifestyle":   true,
		"Photography": true,
		"Cosplay":     true,
		"Art":         true,
		"Fitness":     true,
	}
	categoryClean := "Lifestyle"
	if req.Category != "" {
		if validCategories[req.Category] {
			categoryClean = req.Category
		}
	}

	dwellTimeClean := req.DwellTimeSeconds
	if dwellTimeClean < 0 {
		dwellTimeClean = 0
	} else if dwellTimeClean > 3600 {
		dwellTimeClean = 3600 // Cap dwell time at 1 hour to prevent score inflation
	}

	if req.PostID != "" && len(req.PostID) != 36 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid Post ID format"})
	}
	if req.CreatorID != "" && len(req.CreatorID) != 36 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid Creator ID format"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var postIDVal, creatorIDVal interface{}
	postIDVal = nil
	if req.PostID != "" {
		postIDVal = req.PostID
	}
	creatorIDVal = nil
	if req.CreatorID != "" {
		creatorIDVal = req.CreatorID
	}

	_, err := database.Pool.Exec(ctx,
		`INSERT INTO user_interactions (user_id, post_id, creator_id, interaction_type, dwell_time_seconds, category)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		userID, postIDVal, creatorIDVal, interactionTypeClean, dwellTimeClean, categoryClean,
	)
	if err != nil {
		log.Printf("⚠️ Warning: Failed to record interaction: %v", err)
	}

	var scoreDelta float64 = 1.0
	switch interactionTypeClean {
	case "unlock":
		scoreDelta = 25.0
	case "bookmark":
		scoreDelta = 10.0
	case "like":
		scoreDelta = 5.0
	case "comment":
		scoreDelta = 4.0
	case "view":
		if dwellTimeClean > 0 {
			scoreDelta = minFloat(float64(dwellTimeClean)*0.2, 8.0)
		} else {
			scoreDelta = 1.0
		}
	}

	_, err = database.Pool.Exec(ctx,
		`INSERT INTO user_interests (user_id, interests)
		 VALUES ($1, jsonb_build_object($2::text, $3::numeric))
		 ON CONFLICT (user_id) DO UPDATE SET
		     interests = jsonb_set(
		         COALESCE(user_interests.interests, '{}'::jsonb),
		         ARRAY[$2::text],
		         to_jsonb(COALESCE((user_interests.interests->>$2::text)::numeric, 0.0) + $3::numeric)
		     ),
		     updated_at = NOW()`,
		userID, categoryClean, scoreDelta,
	)
	if err != nil {
		log.Printf("⚠️ Warning: Failed to update user interests: %v", err)
	}

	return c.JSON(fiber.Map{"status": "recorded"})
}
