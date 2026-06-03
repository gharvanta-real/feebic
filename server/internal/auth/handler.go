package auth

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"log"
	"net/http"
	"net/mail"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	"server/internal/config"
	"server/internal/database"
)

type RegisterRequest struct {
	Email       string  `json:"email"`
	Password    string  `json:"password"`
	Username    string  `json:"username"`
	DisplayName string  `json:"display_name"`
	Role        string  `json:"role"` // "fan" or "creator"
	SubPrice    float64 `json:"sub_price"`
	Phone       string  `json:"phone"`
	Country     string  `json:"country"`
	Bio         string  `json:"bio"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

const externalManagedPasswordHash = "external-auth-managed-placeholder-hash"

type StartRegistrationRequest struct {
	RegisterRequest
}

type VerifyRegistrationRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

type PasswordResetStartRequest struct {
	Email string `json:"email"`
}

type PasswordResetVerifyRequest struct {
	Email       string `json:"email"`
	Code        string `json:"code"`
	NewPassword string `json:"new_password"`
}

type pendingRegistration struct {
	Email       string  `json:"email"`
	Password    string  `json:"password"`
	Username    string  `json:"username"`
	DisplayName string  `json:"display_name"`
	Role        string  `json:"role"`
	SubPrice    float64 `json:"sub_price"`
	Phone       string  `json:"phone"`
	Country     string  `json:"country"`
	Bio         string  `json:"bio"`
}

func RegisterDisabled(c *fiber.Ctx) error {
	return c.Status(fiber.StatusGone).JSON(fiber.Map{
		"error": "Email verification is required. Use /auth/register/start and /auth/register/verify.",
	})
}

// Generate JWT helper
func generateToken(userID string, role string, secret string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"role":    role,
		"exp":     time.Now().Add(72 * time.Hour).Unix(),
	})
	return token.SignedString([]byte(secret))
}

func Register(c *fiber.Ctx) error {
	req := new(RegisterRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Username = normalizeUsername(req.Username)
	req.DisplayName = strings.TrimSpace(req.DisplayName)
	req.Phone = strings.TrimSpace(req.Phone)
	req.Country = strings.TrimSpace(req.Country)

	// Validate inputs
	if _, err := mail.ParseAddress(req.Email); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid email address"})
	}
	if len(req.Password) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Password must be at least 8 characters"})
	}
	if !isValidUsername(req.Username) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Username must be 3-30 chars and use only letters, numbers, periods, or underscores"})
	}
	if req.DisplayName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Username and Display Name are required"})
	}
	if req.Role != "fan" && req.Role != "creator" {
		req.Role = "fan" // fallback
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Check if email already exists
	var exists bool
	err := database.Pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", req.Email).Scan(&exists)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error"})
	}
	if exists {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Email is already registered"})
	}

	// Check if username already exists
	err = database.Pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM profiles WHERE username = $1)", req.Username).Scan(&exists)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error"})
	}
	if exists {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":       "Username is already taken",
			"suggestions": usernameSuggestions(req.Username),
		})
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Hashing error"})
	}

	// Execute transaction to insert User + Profile
	tx, err := database.Pool.Begin(ctx)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Transaction initiation failed"})
	}
	defer tx.Rollback(ctx)

	var userID string
	err = tx.QueryRow(ctx,
		"INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id",
		req.Email, string(hashedPassword), req.Role,
	).Scan(&userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create user account"})
	}

	// Set default avatars if empty
	avatar := "/assets/39bc5c3eed51d62c1022c60686bb459a.png"
	cover := "/assets/cb15617a79d7713ffa4a6de36f808a76.png"
	if req.Role == "creator" {
		avatar = "/assets/082f4723389abb44b68b64dfc082268b.png"
		cover = "/assets/082f4723389abb44b68b64dfc082268b.png"
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO profiles (user_id, username, display_name, bio, avatar, cover_photo, sub_price, phone, country, email_verified, phone_verified) 
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, false)`,
		userID, req.Username, req.DisplayName, req.Bio, avatar, cover, req.SubPrice, req.Phone, req.Country,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create user profile"})
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save profile changes"})
	}

	cfg := config.Load()
	token, err := generateToken(userID, req.Role, cfg.JWTSecret)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate authorization token"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "User registered successfully",
		"token":   token,
		"user": fiber.Map{
			"id":           userID,
			"email":        req.Email,
			"role":         req.Role,
			"username":     req.Username,
			"display_name": req.DisplayName,
			"phone":        req.Phone,
			"country":      req.Country,
			"bio":          req.Bio,
		},
	})
}

func StartRegistration(c *fiber.Ctx) error {
	req := new(StartRegistrationRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	pending, err := validateRegistration(&req.RegisterRequest)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var exists bool
	var passwordHash string
	err = database.Pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", pending.Email).Scan(&exists)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error"})
	}
	if exists {
		if err := database.Pool.QueryRow(ctx, "SELECT password_hash FROM users WHERE email = $1", pending.Email).Scan(&passwordHash); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error"})
		}
		if !isExternalManagedPassword(passwordHash) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Email is already registered. Sign in instead."})
		}
	}

	err = database.Pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM profiles WHERE username = $1 AND user_id NOT IN (SELECT id FROM users WHERE email = $2))", pending.Username, pending.Email).Scan(&exists)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error"})
	}
	if exists {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":       "Username is already taken",
			"suggestions": usernameSuggestions(pending.Username),
		})
	}

	code, err := randomCode()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create verification code"})
	}
	codeHash, err := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not secure verification code"})
	}
	payload, err := json.Marshal(pending)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not prepare account details"})
	}

	_, err = database.Pool.Exec(ctx,
		`INSERT INTO email_verification_codes (email, code_hash, purpose, payload, expires_at)
		 VALUES ($1, $2, 'signup', $3::jsonb, $4)`,
		pending.Email, string(codeHash), string(payload), time.Now().Add(10*time.Minute),
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not save verification code"})
	}

	cfg := config.Load()
	if err := sendVerificationEmail(cfg, pending.Email, pending.DisplayName, code, "Verify your Felbic account", "use this code to finish creating your Felbic account"); err != nil {
		log.Printf("verification email failed for %s: %v", pending.Email, err)
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "Could not send verification email. Check Resend configuration."})
	}

	return c.JSON(fiber.Map{
		"message":    "Verification code sent",
		"email":      pending.Email,
		"expires_in": 600,
	})
}

func VerifyRegistration(c *fiber.Ctx) error {
	req := new(VerifyRegistrationRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	email := strings.TrimSpace(strings.ToLower(req.Email))
	code := strings.TrimSpace(req.Code)
	if _, err := mail.ParseAddress(email); err != nil || len(code) < 4 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid verification request"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 12*time.Second)
	defer cancel()

	var id, codeHash, payloadRaw string
	var attempts int
	var expiresAt time.Time
	err := database.Pool.QueryRow(ctx,
		`SELECT id, code_hash, payload::text, attempts, expires_at
		 FROM email_verification_codes
		 WHERE email = $1 AND purpose = 'signup' AND consumed_at IS NULL
		 ORDER BY created_at DESC
		 LIMIT 1`,
		email,
	).Scan(&id, &codeHash, &payloadRaw, &attempts, &expiresAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No active verification code found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database lookup failed"})
	}
	if time.Now().After(expiresAt) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Verification code expired"})
	}
	if attempts >= 5 {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "Too many verification attempts"})
	}
	if err := bcrypt.CompareHashAndPassword([]byte(codeHash), []byte(code)); err != nil {
		_, _ = database.Pool.Exec(ctx, "UPDATE email_verification_codes SET attempts = attempts + 1 WHERE id = $1", id)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Verification code is incorrect"})
	}

	var pending pendingRegistration
	if err := json.Unmarshal([]byte(payloadRaw), &pending); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not read pending account"})
	}

	token, user, err := upsertVerifiedUser(ctx, pending)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	_, _ = database.Pool.Exec(ctx, "UPDATE email_verification_codes SET consumed_at = CURRENT_TIMESTAMP WHERE id = $1", id)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Email verified and account ready",
		"token":   token,
		"user":    user,
	})
}

func StartPasswordReset(c *fiber.Ctx) error {
	req := new(PasswordResetStartRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	email := strings.TrimSpace(strings.ToLower(req.Email))
	if _, err := mail.ParseAddress(email); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid email address"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var displayName string
	err := database.Pool.QueryRow(ctx,
		`SELECT COALESCE(p.display_name, split_part(u.email, '@', 1))
		 FROM users u
		 LEFT JOIN profiles p ON p.user_id = u.id
		 WHERE u.email = $1`,
		email,
	).Scan(&displayName)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.JSON(fiber.Map{
				"message":    "If this email exists, a reset code has been sent.",
				"email":      email,
				"expires_in": 600,
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database lookup failed"})
	}

	code, err := randomCode()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create verification code"})
	}
	codeHash, err := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not secure verification code"})
	}

	_, err = database.Pool.Exec(ctx,
		`INSERT INTO email_verification_codes (email, code_hash, purpose, payload, expires_at)
		 VALUES ($1, $2, 'password_reset', '{}'::jsonb, $3)`,
		email, string(codeHash), time.Now().Add(10*time.Minute),
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not save reset code"})
	}

	cfg := config.Load()
	if err := sendVerificationEmail(cfg, email, displayName, code, "Reset your Felbic password", "use this code to create a new Felbic password"); err != nil {
		log.Printf("password reset email failed for %s: %v", email, err)
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "Could not send reset email. Check Resend configuration."})
	}

	return c.JSON(fiber.Map{
		"message":    "Password reset code sent",
		"email":      email,
		"expires_in": 600,
	})
}

func VerifyPasswordReset(c *fiber.Ctx) error {
	req := new(PasswordResetVerifyRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	email := strings.TrimSpace(strings.ToLower(req.Email))
	code := strings.TrimSpace(req.Code)
	if _, err := mail.ParseAddress(email); err != nil || len(code) < 4 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid reset request"})
	}
	if len(req.NewPassword) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "New password must be at least 8 characters"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 12*time.Second)
	defer cancel()

	var id, codeHash string
	var attempts int
	var expiresAt time.Time
	err := database.Pool.QueryRow(ctx,
		`SELECT id, code_hash, attempts, expires_at
		 FROM email_verification_codes
		 WHERE email = $1 AND purpose = 'password_reset' AND consumed_at IS NULL
		 ORDER BY created_at DESC
		 LIMIT 1`,
		email,
	).Scan(&id, &codeHash, &attempts, &expiresAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No active reset code found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database lookup failed"})
	}
	if time.Now().After(expiresAt) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Reset code expired"})
	}
	if attempts >= 5 {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "Too many reset attempts"})
	}
	if err := bcrypt.CompareHashAndPassword([]byte(codeHash), []byte(code)); err != nil {
		_, _ = database.Pool.Exec(ctx, "UPDATE email_verification_codes SET attempts = attempts + 1 WHERE id = $1", id)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Reset code is incorrect"})
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash new password"})
	}

	cmd, err := database.Pool.Exec(ctx, "UPDATE users SET password_hash = $1 WHERE email = $2", string(hashedPassword), email)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update password"})
	}
	if cmd.RowsAffected() == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Account not found"})
	}

	_, _ = database.Pool.Exec(ctx, "UPDATE email_verification_codes SET consumed_at = CURRENT_TIMESTAMP WHERE id = $1", id)
	return c.JSON(fiber.Map{"message": "Password updated successfully"})
}

func validateRegistration(req *RegisterRequest) (pendingRegistration, error) {
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Username = normalizeUsername(req.Username)
	req.DisplayName = strings.TrimSpace(req.DisplayName)
	req.Phone = strings.TrimSpace(req.Phone)
	req.Country = strings.TrimSpace(req.Country)
	req.Bio = strings.TrimSpace(req.Bio)

	if _, err := mail.ParseAddress(req.Email); err != nil {
		return pendingRegistration{}, errors.New("Invalid email address")
	}
	if len(req.Password) < 8 {
		return pendingRegistration{}, errors.New("Password must be at least 8 characters")
	}
	if !isValidUsername(req.Username) {
		return pendingRegistration{}, errors.New("Username must be 3-30 chars and use only letters, numbers, periods, or underscores")
	}
	if req.DisplayName == "" {
		return pendingRegistration{}, errors.New("Display name is required")
	}
	if req.Role != "fan" && req.Role != "creator" {
		req.Role = "fan"
	}
	if req.Country == "" {
		req.Country = "India"
	}

	return pendingRegistration{
		Email:       req.Email,
		Password:    req.Password,
		Username:    req.Username,
		DisplayName: req.DisplayName,
		Role:        req.Role,
		SubPrice:    req.SubPrice,
		Phone:       req.Phone,
		Country:     req.Country,
		Bio:         req.Bio,
	}, nil
}

func upsertVerifiedUser(ctx context.Context, req pendingRegistration) (string, fiber.Map, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return "", nil, errors.New("Hashing error")
	}

	tx, err := database.Pool.Begin(ctx)
	if err != nil {
		return "", nil, errors.New("Transaction initiation failed")
	}
	defer tx.Rollback(ctx)

	var userID string
	var existingHash string
	err = tx.QueryRow(ctx, "SELECT id, password_hash FROM users WHERE email = $1", req.Email).Scan(&userID, &existingHash)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return "", nil, errors.New("Database lookup failed")
	}
	if errors.Is(err, pgx.ErrNoRows) {
		err = tx.QueryRow(ctx,
			"INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id",
			req.Email, string(hashedPassword), req.Role,
		).Scan(&userID)
		if err != nil {
			return "", nil, errors.New("Failed to create user account")
		}
	} else if isExternalManagedPassword(existingHash) {
		_, err = tx.Exec(ctx, "UPDATE users SET password_hash = $1, role = $2 WHERE id = $3", string(hashedPassword), req.Role, userID)
		if err != nil {
			return "", nil, errors.New("Failed to activate existing account")
		}
	} else {
		return "", nil, errors.New("Email is already registered")
	}

	avatar := "/assets/39bc5c3eed51d62c1022c60686bb459a.png"
	cover := "/assets/cb15617a79d7713ffa4a6de36f808a76.png"
	if req.Role == "creator" {
		avatar = "/assets/082f4723389abb44b68b64dfc082268b.png"
		cover = "/assets/082f4723389abb44b68b64dfc082268b.png"
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO profiles (user_id, username, display_name, bio, avatar, cover_photo, sub_price, phone, country, email_verified, phone_verified)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, false)
		 ON CONFLICT (user_id) DO UPDATE SET
		   username = EXCLUDED.username,
		   display_name = EXCLUDED.display_name,
		   bio = EXCLUDED.bio,
		   phone = EXCLUDED.phone,
		   country = EXCLUDED.country,
		   email_verified = true`,
		userID, req.Username, req.DisplayName, req.Bio, avatar, cover, req.SubPrice, req.Phone, req.Country,
	)
	if err != nil {
		return "", nil, errors.New("Failed to create user profile")
	}
	if err := tx.Commit(ctx); err != nil {
		return "", nil, errors.New("Failed to save profile changes")
	}

	cfg := config.Load()
	token, err := generateToken(userID, req.Role, cfg.JWTSecret)
	if err != nil {
		return "", nil, errors.New("Failed to generate authorization token")
	}

	return token, fiber.Map{
		"id":             userID,
		"email":          req.Email,
		"role":           req.Role,
		"username":       req.Username,
		"display_name":   req.DisplayName,
		"phone":          req.Phone,
		"country":        req.Country,
		"bio":            req.Bio,
		"email_verified": true,
	}, nil
}

func randomCode() (string, error) {
	var b [4]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	n := int(b[0])<<24 | int(b[1])<<16 | int(b[2])<<8 | int(b[3])
	if n < 0 {
		n = -n
	}
	return fmt.Sprintf("%06d", n%1000000), nil
}

func sendVerificationEmail(cfg *config.Config, to, name, code, subject, intro string) error {
	if cfg.ResendAPIKey == "" {
		return errors.New("RESEND_API_KEY is not configured")
	}
	displayName := html.EscapeString(strings.TrimSpace(name))
	if displayName == "" {
		displayName = "there"
	}
	body := map[string]interface{}{
		"from":    cfg.ResendFromEmail,
		"to":      []string{to},
		"subject": subject,
		"html": fmt.Sprintf(`
			<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:auto;padding:28px;color:#0f172a">
			  <img src="https://api.felbic.gharvanta.in/logo.png" alt="Felbic" style="height:42px;margin-bottom:20px" />
			  <h1 style="font-size:22px;margin:0 0 8px">%s</h1>
			  <p style="font-size:14px;line-height:1.6;color:#475569">Hi %s, %s. It expires in 10 minutes.</p>
			  <div style="font-size:32px;font-weight:800;letter-spacing:8px;background:#eef9ff;color:#0284c7;border-radius:14px;padding:18px 22px;text-align:center;margin:22px 0">%s</div>
			  <p style="font-size:12px;color:#64748b">If this was not you, ignore this email.</p>
			</div>`, html.EscapeString(subject), displayName, html.EscapeString(intro), html.EscapeString(code)),
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequest(http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+cfg.ResendAPIKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "felbic-"+to+"-"+code)
	req.Header.Set("User-Agent", "felbic-api/1.0")

	client := &http.Client{Timeout: 12 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return fmt.Errorf("resend returned status %d", res.StatusCode)
	}
	return nil
}

func CheckUsername(c *fiber.Ctx) error {
	username := normalizeUsername(c.Params("username"))
	if !isValidUsername(username) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"available":   false,
			"error":       "Username must be 3-30 chars and use only letters, numbers, periods, or underscores",
			"suggestions": usernameSuggestions(username),
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var exists bool
	if err := database.Pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM profiles WHERE username = $1)", username).Scan(&exists); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error"})
	}

	return c.JSON(fiber.Map{
		"username":    username,
		"available":   !exists,
		"suggestions": usernameSuggestions(username),
	})
}

func normalizeUsername(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	value = strings.TrimPrefix(value, "@")
	return value
}

func isValidUsername(value string) bool {
	if len(value) < 3 || len(value) > 30 {
		return false
	}
	matched, _ := regexp.MatchString(`^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$`, value)
	return matched && !strings.Contains(value, "..")
}

func usernameSuggestions(base string) []string {
	base = regexp.MustCompile(`[^a-z0-9._]`).ReplaceAllString(normalizeUsername(base), "")
	base = strings.Trim(base, "._")
	if len(base) < 3 {
		base = "felbic"
	}
	if len(base) > 20 {
		base = base[:20]
	}
	now := time.Now()
	return []string{
		base + "_official",
		base + "." + now.Format("06"),
		base + "_" + now.Format("0602"),
	}
}

func Login(c *fiber.Ctx) error {
	req := new(LoginRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var userID string
	var passwordHash string
	var role string

	err := database.Pool.QueryRow(ctx,
		"SELECT id, password_hash, role FROM users WHERE email = $1",
		req.Email,
	).Scan(&userID, &passwordHash, &role)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid email or password"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database lookup failed"})
	}

	// External-auth imported accounts must set a Felbic password through email verification first.
	if isExternalManagedPassword(passwordHash) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid email or password"})
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid email or password"})
	}

	// Fetch Profile
	var username, displayName, avatar, cover, bio, location, website string
	var subPrice float64
	err = database.Pool.QueryRow(ctx,
		`SELECT username, display_name, avatar, cover_photo, COALESCE(bio, ''), COALESCE(location, ''), COALESCE(website, ''), sub_price 
		 FROM profiles WHERE user_id = $1`,
		userID,
	).Scan(&username, &displayName, &avatar, &cover, &bio, &location, &website, &subPrice)

	if err != nil {
		log.Printf("⚠️ Warning: Profile not found for userID %s: %v", userID, err)
	}

	// Load config for JWT Secret
	cfg := config.Load()

	// Sign Token
	token, err := generateToken(userID, role, cfg.JWTSecret)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate authorization token"})
	}

	return c.JSON(fiber.Map{
		"token": token,
		"user": fiber.Map{
			"id":           userID,
			"email":        req.Email,
			"role":         role,
			"username":     username,
			"display_name": displayName,
			"avatar":       avatar,
			"cover_photo":  cover,
			"bio":          bio,
			"location":     location,
			"website":      website,
			"sub_price":    subPrice,
		},
	})
}

func isExternalManagedPassword(hash string) bool {
	return hash == externalManagedPasswordHash || strings.Contains(hash, "oauth-managed-placeholder-hash")
}
