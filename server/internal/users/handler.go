package users

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	"server/internal/database"
)

type UpdateProfileRequest struct {
	Email       string  `json:"email"`
	Username    string  `json:"username"`
	DisplayName string  `json:"display_name"`
	Bio         string  `json:"bio"`
	Avatar      string  `json:"avatar"`
	CoverPhoto  string  `json:"cover_photo"`
	Location    string  `json:"location"`
	Website     string  `json:"website"`
	SubPrice    float64 `json:"sub_price"`
	Role        string  `json:"role"`
}

// 1. Get current logged-in user's profile
func GetProfile(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var email, role, username, displayName, bio, avatar, cover, location, website string
	var subPrice float64
	var kycVerified, kycUploaded, twoFactor, biometric bool
	var kycName, kycDocumentType string
	var discountActive, callsEnabled bool
	var discountPercent int
	var callRate float64

	err := database.Pool.QueryRow(ctx,
		`SELECT u.email, u.role, p.username, p.display_name, COALESCE(p.bio, ''), COALESCE(p.avatar, ''), 
		        COALESCE(p.cover_photo, ''), COALESCE(p.location, ''), COALESCE(p.website, ''), p.sub_price,
		        COALESCE(p.kyc_verified, false), COALESCE(p.kyc_uploaded, false), COALESCE(p.kyc_name, ''),
		        COALESCE(p.kyc_document_type, ''), COALESCE(p.two_factor, false), COALESCE(p.biometric, true),
		        COALESCE(p.discount_active, false), COALESCE(p.discount_percent, 0),
		        COALESCE(p.calls_enabled, false), COALESCE(p.call_rate, 0.00)
		 FROM users u
		 LEFT JOIN profiles p ON u.id = p.user_id
		 WHERE u.id = $1`,
		userID,
	).Scan(&email, &role, &username, &displayName, &bio, &avatar, &cover, &location, &website, &subPrice,
		&kycVerified, &kycUploaded, &kycName, &kycDocumentType, &twoFactor, &biometric,
		&discountActive, &discountPercent, &callsEnabled, &callRate)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "User account does not exist"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Database lookup failed"})
	}

	return c.JSON(fiber.Map{
		"id":                 userID,
		"email":              email,
		"role":               role,
		"username":           username,
		"display_name":       displayName,
		"bio":                bio,
		"avatar":             avatar,
		"cover_photo":        cover,
		"location":           location,
		"website":            website,
		"sub_price":          subPrice,
		"kyc_verified":       kycVerified,
		"kyc_uploaded":       kycUploaded,
		"kyc_name":           kycName,
		"kyc_document_type":  kycDocumentType,
		"two_factor":         twoFactor,
		"biometric":          biometric,
		"discount_active":    discountActive,
		"discount_percent":   discountPercent,
		"calls_enabled":      callsEnabled,
		"call_rate":          callRate,
	})
}

// 2. Update profile details
func UpdateProfile(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	req := new(UpdateProfileRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if req.Role != "" && req.Role != "fan" && req.Role != "creator" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid account role"})
	}

	tx, err := database.Pool.Begin(ctx)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to start profile update"})
	}
	defer tx.Rollback(ctx)

	if req.Email != "" {
		_, err = tx.Exec(ctx, `UPDATE users SET email = $1 WHERE id = $2`, req.Email, userID)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update email address"})
		}
	}

	// Perform database profile row update
	_, err = tx.Exec(ctx,
		`UPDATE profiles 
		 SET username = $1, display_name = $2, bio = $3, avatar = $4, cover_photo = $5, location = $6, website = $7,
		     sub_price = CASE WHEN $8 > 0 THEN $8 ELSE sub_price END
		 WHERE user_id = $9`,
		req.Username, req.DisplayName, req.Bio, req.Avatar, req.CoverPhoto, req.Location, req.Website, req.SubPrice, userID,
	)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update profile settings"})
	}

	if req.Role != "" {
		_, err = tx.Exec(ctx, `UPDATE users SET role = $1 WHERE id = $2`, req.Role, userID)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update account mode"})
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save profile update"})
	}

	return c.JSON(fiber.Map{"message": "Profile updated successfully"})
}

// 3. List all creators
func ListCreators(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rows, err := database.Pool.Query(ctx,
		`SELECT u.id, p.username, p.display_name, COALESCE(p.bio, ''), COALESCE(p.avatar, ''), 
		        COALESCE(p.cover_photo, ''), COALESCE(p.location, ''), COALESCE(p.website, ''), p.sub_price
		 FROM users u
		 JOIN profiles p ON u.id = p.user_id
		 WHERE u.role = 'creator'
		 ORDER BY p.display_name ASC`,
	)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Database query failed"})
	}
	defer rows.Close()

	creators := []fiber.Map{}
	for rows.Next() {
		var id, username, displayName, bio, avatar, cover, location, website string
		var subPrice float64

		err := rows.Scan(&id, &username, &displayName, &bio, &avatar, &cover, &location, &website, &subPrice)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse creator records"})
		}

		creators = append(creators, fiber.Map{
			"id":           id,
			"username":     username,
			"display_name": displayName,
			"bio":          bio,
			"avatar":       avatar,
			"cover_photo":  cover,
			"location":     location,
			"website":      website,
			"sub_price":    subPrice,
		})
	}

	return c.JSON(creators)
}

// 4. List current fan's active subscriptions
func GetSubscriptions(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rows, err := database.Pool.Query(ctx,
		`SELECT p.username, p.display_name, COALESCE(p.avatar, ''), COALESCE(p.cover_photo, ''),
		        COALESCE(p.bio, ''), p.sub_price, s.status, s.expires_at
		 FROM subscriptions s
		 JOIN profiles p ON s.creator_id = p.user_id
		 WHERE s.fan_id = $1
		 ORDER BY s.created_at DESC`,
		userID,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to query subscriptions"})
	}
	defer rows.Close()

	subs := []fiber.Map{}
	for rows.Next() {
		var username, displayName, avatar, coverPhoto, bio, status string
		var subPrice float64
		var expiresAt time.Time

		if err := rows.Scan(&username, &displayName, &avatar, &coverPhoto, &bio, &subPrice, &status, &expiresAt); err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse subscription"})
		}

		if status == "active" && expiresAt.Before(time.Now()) {
			status = "expired"
		}

		subs = append(subs, fiber.Map{
			"username":    username,
			"name":        displayName,
			"displayName": displayName,
			"avatar":      avatar,
			"cover":       coverPhoto,
			"bio":         bio,
			"price":       subPrice,
			"subPrice":    subPrice,
			"status":      status,
			"expires_at":  expiresAt.Format(time.RFC3339),
			"expiryDate":  expiresAt.Format("Jan 02, 2006"),
			"autoRenew":   true,
			"verified":    true,
		})
	}

	return c.JSON(subs)
}

// 5. Get creator by username
func GetCreatorByUsername(c *fiber.Ctx) error {
	username := c.Params("username")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var id, displayName, bio, avatar, cover, location, website string
	var subPrice float64

	err := database.Pool.QueryRow(ctx,
		`SELECT u.id, p.display_name, COALESCE(p.bio, ''), COALESCE(p.avatar, ''), 
		        COALESCE(p.cover_photo, ''), COALESCE(p.location, ''), COALESCE(p.website, ''), p.sub_price
		 FROM users u
		 JOIN profiles p ON u.id = p.user_id
		 WHERE p.username = $1 AND u.role = 'creator'`,
		username,
	).Scan(&id, &displayName, &bio, &avatar, &cover, &location, &website, &subPrice)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Creator profile not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Database lookup failed"})
	}

	var postsCount, photosCount, videosCount, fansCount, likesCount int
	_ = database.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM posts WHERE creator_id = $1", id).Scan(&postsCount)
	_ = database.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM posts WHERE creator_id = $1 AND media_type = 'image'", id).Scan(&photosCount)
	_ = database.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM posts WHERE creator_id = $1 AND media_type = 'video'", id).Scan(&videosCount)
	_ = database.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM subscriptions WHERE creator_id = $1 AND status = 'active' AND expires_at > NOW()", id).Scan(&fansCount)
	_ = database.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM post_likes pl
		 JOIN posts p ON pl.post_id = p.id
		 WHERE p.creator_id = $1`,
		id,
	).Scan(&likesCount)

	// Query top tipping fans from transactions ledger
	topFans := []fiber.Map{}
	fanRows, err := database.Pool.Query(ctx,
		`SELECT 
			p.display_name,
			p.username,
			COALESCE(p.avatar, ''),
			SUM(ABS(t.amount)) AS total_contributed
		 FROM transactions t
		 JOIN profiles p ON t.user_id = p.user_id
		 WHERE t.amount < 0 
		   AND t.title ~* ('@' || $1 || '($|[^a-zA-Z0-9_])')
		 GROUP BY t.user_id, p.display_name, p.username, p.avatar
		 ORDER BY total_contributed DESC
		 LIMIT 5`,
		username,
	)
	if err == nil {
		defer fanRows.Close()
		for fanRows.Next() {
			var displayName, fanUsername, avatar string
			var totalContributed float64
			if err := fanRows.Scan(&displayName, &fanUsername, &avatar, &totalContributed); err == nil {
				topFans = append(topFans, fiber.Map{
					"name":             displayName,
					"username":         fanUsername,
					"avatar":           avatar,
					"totalContributed": totalContributed,
					"joinedDate":       "Active fan",
				})
			}
		}
	}

	return c.JSON(fiber.Map{
		"id":           id,
		"username":     username,
		"display_name": displayName,
		"bio":          bio,
		"avatar":       avatar,
		"cover_photo":  cover,
		"location":     location,
		"website":      website,
		"sub_price":    subPrice,
		"posts_count":  postsCount,
		"photos_count": photosCount,
		"videos_count": videosCount,
		"fans_count":   fansCount,
		"likes_count":  likesCount,
		"top_fans":     topFans,
	})
}

func GetRelationships(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	favorites, err := listRelationshipUsernames(ctx,
		`SELECT p.username
		 FROM creator_favorites f
		 JOIN profiles p ON f.creator_id = p.user_id
		 WHERE f.user_id = $1
		 ORDER BY f.created_at DESC`,
		userID,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load favorite creators"})
	}

	blocked, err := listRelationshipUsernames(ctx,
		`SELECT p.username
		 FROM user_blocks b
		 JOIN profiles p ON b.blocked_id = p.user_id
		 WHERE b.blocker_id = $1
		 ORDER BY b.created_at DESC`,
		userID,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load blocked users"})
	}

	return c.JSON(fiber.Map{
		"favorites": favorites,
		"blocked":   blocked,
	})
}

func ToggleFavorite(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	username := c.Params("username")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	creatorID, err := lookupUserIDByUsername(ctx, username, "creator")
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Creator does not exist"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load creator"})
	}

	isFavorite, err := toggleJoinRow(ctx,
		"creator_favorites",
		"user_id",
		"creator_id",
		userID,
		creatorID,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update favorite"})
	}

	return c.JSON(fiber.Map{"is_favorite": isFavorite})
}

func ToggleBlock(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	username := c.Params("username")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	blockedID, err := lookupUserIDByUsername(ctx, username, "")
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "User does not exist"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load user"})
	}
	if blockedID == userID {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "You cannot block yourself"})
	}

	isBlocked, err := toggleJoinRow(ctx,
		"user_blocks",
		"blocker_id",
		"blocked_id",
		userID,
		blockedID,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update block"})
	}

	return c.JSON(fiber.Map{"is_blocked": isBlocked})
}

func listRelationshipUsernames(ctx context.Context, query string, userID string) ([]string, error) {
	rows, err := database.Pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	usernames := []string{}
	for rows.Next() {
		var username string
		if err := rows.Scan(&username); err != nil {
			return nil, err
		}
		usernames = append(usernames, username)
	}
	return usernames, rows.Err()
}

func lookupUserIDByUsername(ctx context.Context, username string, requiredRole string) (string, error) {
	query := `SELECT p.user_id::text
		FROM profiles p
		JOIN users u ON p.user_id = u.id
		WHERE p.username = $1`
	args := []interface{}{username}
	if requiredRole != "" {
		query += " AND u.role = $2"
		args = append(args, requiredRole)
	}

	var id string
	err := database.Pool.QueryRow(ctx, query, args...).Scan(&id)
	return id, err
}

func toggleJoinRow(ctx context.Context, table string, leftColumn string, rightColumn string, leftID string, rightID string) (bool, error) {
	var exists bool
	err := database.Pool.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM "+table+" WHERE "+leftColumn+" = $1 AND "+rightColumn+" = $2)",
		leftID, rightID,
	).Scan(&exists)
	if err != nil {
		return false, err
	}
	if exists {
		_, err = database.Pool.Exec(ctx,
			"DELETE FROM "+table+" WHERE "+leftColumn+" = $1 AND "+rightColumn+" = $2",
			leftID, rightID,
		)
		return false, err
	}
	_, err = database.Pool.Exec(ctx,
		"INSERT INTO "+table+" ("+leftColumn+", "+rightColumn+") VALUES ($1, $2)",
		leftID, rightID,
	)
	return true, err
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

type DeleteAccountRequest struct {
	Password string `json:"password"`
}

type SubmitKYCRequest struct {
	LegalName    string `json:"legal_name"`
	DocumentType string `json:"document_type"`
}

type UpdateSecurityRequest struct {
	TwoFactor *bool `json:"two_factor"`
	Biometric *bool `json:"biometric"`
}

type UpdateDiscountRequest struct {
	DiscountActive  *bool `json:"discount_active"`
	DiscountPercent *int  `json:"discount_percent"`
}

type UpdateCallsRequest struct {
	CallsEnabled    *bool    `json:"calls_enabled"`
	CallRate        *float64 `json:"call_rate"`
}

func ChangePassword(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	req := new(ChangePasswordRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if len(req.NewPassword) < 8 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "New password must be at least 8 characters"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var passwordHash string
	err := database.Pool.QueryRow(ctx, "SELECT password_hash FROM users WHERE id = $1", userID).Scan(&passwordHash)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "User lookup failed"})
	}

	// Verify current password only if it's not an OAuth account
	if passwordHash != "clerk-oauth-managed-placeholder-hash" && req.CurrentPassword != "" {
		if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.CurrentPassword)); err != nil {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Current password is incorrect"})
		}
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash new password"})
	}

	_, err = database.Pool.Exec(ctx, "UPDATE users SET password_hash = $1 WHERE id = $2", string(hashedPassword), userID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update password"})
	}

	return c.JSON(fiber.Map{"message": "Password updated successfully"})
}

func DeleteAccount(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	req := new(DeleteAccountRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var passwordHash string
	err := database.Pool.QueryRow(ctx, "SELECT password_hash FROM users WHERE id = $1", userID).Scan(&passwordHash)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "User lookup failed"})
	}

	// Verify password only if it's not an OAuth account
	if passwordHash != "clerk-oauth-managed-placeholder-hash" {
		if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Confirmation password is incorrect"})
		}
	}

	_, err = database.Pool.Exec(ctx, "DELETE FROM users WHERE id = $1", userID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete account from database"})
	}

	return c.JSON(fiber.Map{"message": "Account deleted successfully"})
}

func SubmitKYC(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	req := new(SubmitKYCRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.LegalName == "" || req.DocumentType == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Legal name and document type are required"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := database.Pool.Exec(ctx,
		`UPDATE profiles 
		 SET kyc_verified = true, kyc_uploaded = true, kyc_name = $1, kyc_document_type = $2
		 WHERE user_id = $3`,
		req.LegalName, req.DocumentType, userID,
	)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save verification status"})
	}

	return c.JSON(fiber.Map{"message": "Verification submitted successfully"})
}

func UpdateSecurity(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	req := new(UpdateSecurityRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if req.TwoFactor != nil {
		_, err := database.Pool.Exec(ctx, "UPDATE profiles SET two_factor = $1 WHERE user_id = $2", *req.TwoFactor, userID)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update 2FA setting"})
		}
	}

	if req.Biometric != nil {
		_, err := database.Pool.Exec(ctx, "UPDATE profiles SET biometric = $1 WHERE user_id = $2", *req.Biometric, userID)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update biometric setting"})
		}
	}

	return c.JSON(fiber.Map{"message": "Security settings updated"})
}

func UpdateDiscount(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	req := new(UpdateDiscountRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if req.DiscountActive != nil {
		_, err := database.Pool.Exec(ctx, "UPDATE profiles SET discount_active = $1 WHERE user_id = $2", *req.DiscountActive, userID)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update discount status"})
		}
	}

	if req.DiscountPercent != nil {
		_, err := database.Pool.Exec(ctx, "UPDATE profiles SET discount_percent = $1 WHERE user_id = $2", *req.DiscountPercent, userID)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update discount percentage"})
		}
	}

	return c.JSON(fiber.Map{"message": "Discount campaign settings updated"})
}

func UpdateCalls(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	req := new(UpdateCallsRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if req.CallsEnabled != nil {
		_, err := database.Pool.Exec(ctx, "UPDATE profiles SET calls_enabled = $1 WHERE user_id = $2", *req.CallsEnabled, userID)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update calls setting"})
		}
	}

	if req.CallRate != nil {
		_, err := database.Pool.Exec(ctx, "UPDATE profiles SET call_rate = $1 WHERE user_id = $2", *req.CallRate, userID)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update call rate"})
		}
	}

	return c.JSON(fiber.Map{"message": "Calls settings updated"})
}
