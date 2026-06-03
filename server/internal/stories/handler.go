package stories

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"

	"server/internal/database"
)

type CreateStoryRequest struct {
	StoryURL string `json:"story_url"`
	Location string `json:"location"`
}

// Slide representation matching StorySlide interface
type StorySlide struct {
	ID       string `json:"id"`
	StoryURL string `json:"storyUrl"`
	Time     string `json:"time"`
	Location string `json:"location,omitempty"`
}

// Grouped creator stories matching Story interface
type CreatorStory struct {
	Username string       `json:"username"`
	Name     string       `json:"name"`
	Avatar   string       `json:"avatar"`
	IsUnread bool         `json:"isUnread"`
	Items    []StorySlide `json:"items"`
}

// 1. Create a story slide (Creators only)
func CreateStory(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	userRole := c.Locals("userRole").(string)

	if userRole != "creator" {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Only creators are allowed to publish stories"})
	}

	req := new(CreateStoryRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.StoryURL == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Story media URL is required"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Story expires in exactly 24 hours
	expiresAt := time.Now().Add(24 * time.Hour)

	_, err := database.Pool.Exec(ctx,
		`INSERT INTO stories (creator_id, story_url, location, expires_at) 
		 VALUES ($1, $2, $3, $4)`,
		userID, req.StoryURL, req.Location, expiresAt,
	)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save story slide"})
	}

	return c.Status(http.StatusCreated).JSON(fiber.Map{"message": "Story published successfully"})
}

// 2. Fetch and group active stories (expires_at > NOW)
func GetActiveStories(c *fiber.Ctx) error {
	userID := ""
	if localUserID, ok := c.Locals("userID").(string); ok {
		userID = localUserID
	}
	var viewerID interface{} = nil
	if userID != "" {
		viewerID = userID
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Fetch all stories that haven't expired
	rows, err := database.Pool.Query(ctx,
		`SELECT s.id, s.story_url, COALESCE(s.location, ''), s.created_at, 
		        p.username, p.display_name, COALESCE(p.avatar, ''),
		        EXISTS(SELECT 1 FROM story_views sv WHERE sv.story_id = s.id AND sv.user_id = $1) AS is_viewed
		 FROM stories s
		 JOIN profiles p ON s.creator_id = p.user_id
		 WHERE s.expires_at > NOW() AND p.hidden = false
		 ORDER BY s.created_at ASC`,
		viewerID,
	)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch stories"})
	}
	defer rows.Close()

	// Group stories by creator username to match nested React state
	creatorIndex := make(map[string]*CreatorStory)
	orderedCreators := []*CreatorStory{}

	for rows.Next() {
		var slideID, storyURL, location, username, displayName, avatar string
		var createdAt time.Time
		var isViewed bool

		err := rows.Scan(&slideID, &storyURL, &location, &createdAt, &username, &displayName, &avatar, &isViewed)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse story slide row"})
		}

		// Calculate relative duration string (e.g. "2h ago")
		diff := time.Since(createdAt)
		timeStr := "Just now"
		if diff.Hours() >= 1 {
			timeStr = strconv.Itoa(int(diff.Hours())) + "h ago"
		} else if diff.Minutes() >= 1 {
			timeStr = strconv.Itoa(int(diff.Minutes())) + "m ago"
		}

		slide := StorySlide{
			ID:       slideID,
			StoryURL: storyURL,
			Time:     timeStr,
			Location: location,
		}

		if creator, exists := creatorIndex[username]; exists {
			creator.Items = append(creator.Items, slide)
			if !isViewed {
				creator.IsUnread = true
			}
		} else {
			newCreator := &CreatorStory{
				Username: username,
				Name:     displayName,
				Avatar:   avatar,
				IsUnread: !isViewed,
				Items:    []StorySlide{slide},
			}
			creatorIndex[username] = newCreator
			orderedCreators = append(orderedCreators, newCreator)
		}
	}

	return c.JSON(orderedCreators)
}

func MarkStoryViewed(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	storyID := c.Params("id")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := database.Pool.Exec(ctx,
		`INSERT INTO story_views (story_id, user_id)
		 VALUES ($1, $2)
		 ON CONFLICT (story_id, user_id) DO UPDATE SET viewed_at = CURRENT_TIMESTAMP`,
		storyID, userID,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to record story view"})
	}

	return c.JSON(fiber.Map{"message": "Story view recorded"})
}
