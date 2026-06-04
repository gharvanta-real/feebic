package adminauth

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base32"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	"server/internal/config"
	"server/internal/database"
)

// ─── Types ────────────────────────────────────────────────────────────────────

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type TOTPVerifyRequest struct {
	Step1Token string `json:"step1_token"`
	TOTPCode   string `json:"totp_code"`
}

type TOTPConfirmRequest struct {
	TOTPCode string `json:"totp_code"`
}

type CreateStaffRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"` // "admin", "moderator", "support"
}

type UpdateStaffRoleRequest struct {
	Role string `json:"role"`
}

// ─── JWT helpers ───────────────────────────────────────────────────────────────

func generateStep1Token(staffID, email string) (string, error) {
	cfg := config.Load()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"staff_id": staffID,
		"email":    email,
		"purpose":  "admin_step1",
		"exp":      time.Now().Add(5 * time.Minute).Unix(),
	})
	return token.SignedString([]byte(cfg.AdminJWTSecret))
}

func generateAdminToken(staffID, username, role string) (string, error) {
	cfg := config.Load()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"staff_id": staffID,
		"username": username,
		"role":     role,
		"purpose":  "admin_session",
		"exp":      time.Now().Add(12 * time.Hour).Unix(),
	})
	return token.SignedString([]byte(cfg.AdminJWTSecret))
}

func parseStep1Token(tokenStr string) (staffID, email string, err error) {
	cfg := config.Load()
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(cfg.AdminJWTSecret), nil
	})
	if err != nil || !token.Valid {
		return "", "", errors.New("invalid or expired step1 token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["purpose"] != "admin_step1" {
		return "", "", errors.New("invalid token purpose")
	}
	staffID, _ = claims["staff_id"].(string)
	email, _ = claims["email"].(string)
	if staffID == "" || email == "" {
		return "", "", errors.New("missing token fields")
	}
	return staffID, email, nil
}

// ParseAdminToken validates a full admin session JWT
func ParseAdminToken(tokenStr string) (staffID, username, role string, err error) {
	cfg := config.Load()
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(cfg.AdminJWTSecret), nil
	})
	if err != nil || !token.Valid {
		return "", "", "", errors.New("invalid or expired admin token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["purpose"] != "admin_session" {
		return "", "", "", errors.New("invalid token purpose — not an admin session token")
	}
	staffID, _ = claims["staff_id"].(string)
	username, _ = claims["username"].(string)
	role, _ = claims["role"].(string)
	if staffID == "" || username == "" || role == "" {
		return "", "", "", errors.New("incomplete token claims")
	}
	return staffID, username, role, nil
}

// ─── TOTP helpers (RFC 6238) ───────────────────────────────────────────────────

func generateTOTPSecret() (string, error) {
	b := make([]byte, 20)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base32.StdEncoding.WithPadding(base32.StdPadding).EncodeToString(b), nil
}

func generateTOTPQRURL(secret, email, issuer string) string {
	email = strings.ReplaceAll(email, "@", "%40")
	return fmt.Sprintf(
		"otpauth://totp/%s%%3A%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30",
		issuer, email, secret, strings.ReplaceAll(issuer, " ", "%20"),
	)
}

// computeHOTP implements RFC 4226
func computeHOTP(secret []byte, counter uint64) string {
	msg := make([]byte, 8)
	binary.BigEndian.PutUint64(msg, counter)
	mac := hmac.New(sha1.New, secret)
	mac.Write(msg)
	h := mac.Sum(nil)
	offset := h[len(h)-1] & 0x0f
	code := (uint32(h[offset]&0x7f)<<24 |
		uint32(h[offset+1])<<16 |
		uint32(h[offset+2])<<8 |
		uint32(h[offset+3])) % 1_000_000
	return fmt.Sprintf("%06d", code)
}

// verifyTOTP accepts ±1 window (90s grace)
func verifyTOTP(secret, code string) bool {
	secretBytes, err := base32.StdEncoding.WithPadding(base32.StdPadding).DecodeString(strings.ToUpper(secret))
	if err != nil {
		// Try without padding
		secretBytes, err = base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(strings.ToUpper(secret))
		if err != nil {
			return false
		}
	}
	counter := uint64(time.Now().Unix() / 30)
	for _, c := range []uint64{counter - 1, counter, counter + 1} {
		if computeHOTP(secretBytes, c) == strings.TrimSpace(code) {
			return true
		}
	}
	return false
}

// ─── Recovery codes ────────────────────────────────────────────────────────────

func generateRecoveryCodes(count int) ([]string, []string, error) {
	plain := make([]string, count)
	hashed := make([]string, count)
	for i := 0; i < count; i++ {
		b := make([]byte, 10)
		if _, err := rand.Read(b); err != nil {
			return nil, nil, err
		}
		raw := strings.ToUpper(base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(b))
		if len(raw) > 16 {
			raw = raw[:16]
		}
		for len(raw) < 16 {
			raw += "X"
		}
		plain[i] = fmt.Sprintf("%s-%s-%s-%s", raw[0:4], raw[4:8], raw[8:12], raw[12:16])
		h, err := bcrypt.GenerateFromPassword([]byte(plain[i]), bcrypt.MinCost)
		if err != nil {
			return nil, nil, err
		}
		hashed[i] = string(h)
	}
	return plain, hashed, nil
}

func verifyRecoveryCode(hashedCodes []string, input string) (bool, int) {
	input = strings.ToUpper(strings.TrimSpace(input))
	for i, hash := range hashedCodes {
		if strings.HasPrefix(hash, "USED-") {
			continue
		}
		if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(input)); err == nil {
			return true, i
		}
	}
	return false, -1
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

// Step 1: Email + Password → short-lived step1_token
func Login(c *fiber.Ctx) error {
	req := new(LoginRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	email := strings.TrimSpace(strings.ToLower(req.Email))
	if email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Email and password are required"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var staffID, username, passwordHash, role string
	var totpEnabled, isActive bool

	err := database.Pool.QueryRow(ctx,
		`SELECT id, username, password_hash, role,
		        COALESCE(totp_enabled, false), COALESCE(is_active, true)
		 FROM admin_staff WHERE LOWER(email) = $1`,
		email,
	).Scan(&staffID, &username, &passwordHash, &role, &totpEnabled, &isActive)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid credentials"})
		}
		log.Printf("[AdminAuth] DB error on login: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Authentication service error"})
	}

	if !isActive {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "This staff account has been deactivated"})
	}

	// First-time: set the password
	if passwordHash == "PLACEHOLDER_WILL_BE_SET_ON_FIRST_LOGIN" {
		if len(req.Password) < 10 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":     "First login: please set a password of at least 10 characters",
				"first_login": true,
			})
		}
		hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to set password"})
		}
		_, _ = database.Pool.Exec(ctx, "UPDATE admin_staff SET password_hash = $1 WHERE id = $2", string(hashed), staffID)
		passwordHash = string(hashed)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		LogAdminAction(ctx, username, role, "auth.login_failed", "auth", email, map[string]interface{}{"ip": c.IP()})
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid credentials"})
	}

	step1Token, err := generateStep1Token(staffID, email)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate auth token"})
	}

	return c.JSON(fiber.Map{
		"step1_token":  step1Token,
		"totp_required": totpEnabled,
		"totp_setup":   !totpEnabled,
		"username":     username,
		"role":         role,
	})
}

// Step 2: Verify TOTP → full admin JWT
func VerifyTOTP(c *fiber.Ctx) error {
	req := new(TOTPVerifyRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	staffID, _, err := parseStep1Token(req.Step1Token)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Session expired. Please login again."})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var username, role, totpSecret string
	var totpEnabled bool
	var recoveryCodes []string

	err = database.Pool.QueryRow(ctx,
		`SELECT username, role, COALESCE(totp_secret,''),
		        COALESCE(totp_enabled,false), COALESCE(recovery_codes,'{}')
		 FROM admin_staff WHERE id = $1`,
		staffID,
	).Scan(&username, &role, &totpSecret, &totpEnabled, &recoveryCodes)

	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Staff account not found"})
	}

	code := strings.TrimSpace(req.TOTPCode)

	if totpEnabled {
		valid := verifyTOTP(totpSecret, code)
		if !valid {
			// Try recovery code
			matched, idx := verifyRecoveryCode(recoveryCodes, code)
			if !matched {
				LogAdminAction(ctx, username, role, "auth.totp_failed", "auth", username, map[string]interface{}{"ip": c.IP()})
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid authentication code. Check your authenticator app."})
			}
			// Burn used recovery code
			recoveryCodes[idx] = "USED-" + recoveryCodes[idx]
			codesArr := "{" + strings.Join(quoteStrings(recoveryCodes), ",") + "}"
			_, _ = database.Pool.Exec(ctx, "UPDATE admin_staff SET recovery_codes = $1 WHERE id = $2", codesArr, staffID)
		}
	}

	adminToken, err := generateAdminToken(staffID, username, role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate admin token"})
	}

	// Record session
	_, _ = database.Pool.Exec(ctx,
		`INSERT INTO admin_sessions (staff_id, ip_address, user_agent, expires_at, session_token)
		 VALUES ($1, $2, $3, $4, $5)`,
		staffID, c.IP(), string([]byte(c.Get("User-Agent"))[:min(500, len(c.Get("User-Agent")))]),
		time.Now().Add(12*time.Hour), adminToken[:32],
	)

	// Update last login
	_, _ = database.Pool.Exec(ctx,
		"UPDATE admin_staff SET last_login = CURRENT_TIMESTAMP, last_login_ip = $1 WHERE id = $2",
		c.IP(), staffID,
	)

	LogAdminAction(ctx, username, role, "auth.login_success", "auth", username, map[string]interface{}{"ip": c.IP()})

	return c.JSON(fiber.Map{
		"token": adminToken,
		"admin": fiber.Map{
			"id":       staffID,
			"username": username,
			"role":     role,
		},
	})
}

// SetupTOTP — generates QR code + secret for first-time setup
func SetupTOTP(c *fiber.Ctx) error {
	staffID := c.Locals("adminStaffID").(string)
	username := c.Locals("adminUsername").(string)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var email string
	var totpEnabled bool
	_ = database.Pool.QueryRow(ctx, "SELECT email, COALESCE(totp_enabled,false) FROM admin_staff WHERE id = $1", staffID).Scan(&email, &totpEnabled)

	if totpEnabled {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "TOTP is already enabled on this account"})
	}

	secret, err := generateTOTPSecret()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate TOTP secret"})
	}

	_, err = database.Pool.Exec(ctx,
		"UPDATE admin_staff SET totp_secret = $1, totp_verified = false WHERE id = $2",
		secret, staffID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save TOTP secret"})
	}

	qrURL := generateTOTPQRURL(secret, email, "Felbic Ops")

	return c.JSON(fiber.Map{
		"secret":   secret,
		"qr_url":   qrURL,
		"username": username,
		"issuer":   "Felbic Ops",
		"message":  "Scan the QR code with Google Authenticator or Authy, then confirm with the 6-digit code",
	})
}

// ConfirmTOTP — validates setup, enables 2FA, generates recovery codes
func ConfirmTOTP(c *fiber.Ctx) error {
	req := new(TOTPConfirmRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	staffID := c.Locals("adminStaffID").(string)
	username := c.Locals("adminUsername").(string)
	role := c.Locals("adminRole").(string)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var totpSecret string
	_ = database.Pool.QueryRow(ctx, "SELECT COALESCE(totp_secret,'') FROM admin_staff WHERE id = $1", staffID).Scan(&totpSecret)

	if totpSecret == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Run TOTP setup first — call /admin-auth/totp/setup"})
	}

	if !verifyTOTP(totpSecret, strings.TrimSpace(req.TOTPCode)) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid TOTP code. Please check your authenticator app."})
	}

	plainCodes, hashedCodes, err := generateRecoveryCodes(8)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate recovery codes"})
	}

	codesJSON, _ := json.Marshal(hashedCodes)
	_, err = database.Pool.Exec(ctx,
		"UPDATE admin_staff SET totp_enabled = true, totp_verified = true, recovery_codes = $1 WHERE id = $2",
		string(codesJSON), staffID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to activate TOTP"})
	}

	LogAdminAction(ctx, username, role, "auth.totp_enabled", "auth", username, map[string]interface{}{})

	return c.JSON(fiber.Map{
		"message":        "Two-factor authentication activated successfully!",
		"recovery_codes": plainCodes,
		"warning":        "⚠️ Save these 8 recovery codes securely. They WILL NOT be shown again. Each code can only be used once.",
	})
}

// GetMe — returns current admin session info
func GetMe(c *fiber.Ctx) error {
	staffID := c.Locals("adminStaffID").(string)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var username, email, role string
	var totpEnabled bool
	var lastLogin *time.Time
	var lastLoginIP *string

	err := database.Pool.QueryRow(ctx,
		`SELECT username, email, role, COALESCE(totp_enabled,false), last_login, last_login_ip
		 FROM admin_staff WHERE id = $1 AND is_active = true`,
		staffID,
	).Scan(&username, &email, &role, &totpEnabled, &lastLogin, &lastLoginIP)

	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Session invalid or account deactivated"})
	}

	lastLoginStr := ""
	if lastLogin != nil {
		lastLoginStr = lastLogin.Format("2006-01-02 15:04:05")
	}
	lastLoginIPStr := ""
	if lastLoginIP != nil {
		lastLoginIPStr = *lastLoginIP
	}

	return c.JSON(fiber.Map{
		"id":            staffID,
		"username":      username,
		"email":         email,
		"role":          role,
		"totp_enabled":  totpEnabled,
		"last_login":    lastLoginStr,
		"last_login_ip": lastLoginIPStr,
	})
}

// Logout — revoke all active sessions
func Logout(c *fiber.Ctx) error {
	staffID := c.Locals("adminStaffID").(string)
	username := c.Locals("adminUsername").(string)
	role := c.Locals("adminRole").(string)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, _ = database.Pool.Exec(ctx,
		"UPDATE admin_sessions SET is_revoked = true WHERE staff_id = $1",
		staffID,
	)

	LogAdminAction(ctx, username, role, "auth.logout", "auth", username, map[string]interface{}{"ip": c.IP()})

	return c.JSON(fiber.Map{"message": "Logged out successfully. All sessions revoked."})
}

// CreateStaff — admin creates a new staff account
func CreateStaff(c *fiber.Ctx) error {
	req := new(CreateStaffRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	req.Username = strings.ToLower(strings.TrimSpace(req.Username))
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	if req.Username == "" || req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Username, email and password are required"})
	}
	if len(req.Password) < 10 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Staff password must be at least 10 characters"})
	}

	validRoles := map[string]bool{"admin": true, "moderator": true, "support": true}
	if !validRoles[req.Role] {
		req.Role = "moderator"
	}

	creatorID := c.Locals("adminStaffID").(string)
	creatorUsername := c.Locals("adminUsername").(string)
	creatorRole := c.Locals("adminRole").(string)

	if req.Role == "admin" && creatorRole != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only admin-level accounts can create other admins"})
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var newID string
	err = database.Pool.QueryRow(ctx,
		`INSERT INTO admin_staff (username, email, password_hash, role, created_by, is_active)
		 VALUES ($1, $2, $3, $4, $5, true) RETURNING id`,
		req.Username, req.Email, string(hashed), req.Role, creatorID,
	).Scan(&newID)

	if err != nil {
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Username or email already exists"})
		}
		log.Printf("[AdminAuth] CreateStaff error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create staff account"})
	}

	LogAdminAction(ctx, creatorUsername, creatorRole, "staff.created", "staff", req.Username, map[string]interface{}{
		"new_role":  req.Role,
		"new_email": req.Email,
	})

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":  "Staff account created successfully",
		"id":       newID,
		"username": req.Username,
		"email":    req.Email,
		"role":     req.Role,
	})
}

// GetStaffList — list all staff accounts
func GetStaffList(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rows, err := database.Pool.Query(ctx,
		`SELECT id, username, email, role, COALESCE(totp_enabled,false),
		        COALESCE(is_active,true), last_login, last_login_ip, created_at
		 FROM admin_staff ORDER BY created_at DESC`,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch staff list"})
	}
	defer rows.Close()

	type StaffItem struct {
		ID          string `json:"id"`
		Username    string `json:"username"`
		Email       string `json:"email"`
		Role        string `json:"role"`
		TOTPEnabled bool   `json:"totpEnabled"`
		IsActive    bool   `json:"isActive"`
		LastLogin   string `json:"lastLogin"`
		LastLoginIP string `json:"lastLoginIp"`
		CreatedAt   string `json:"createdAt"`
	}

	var list []StaffItem
	for rows.Next() {
		var s StaffItem
		var lastLogin *time.Time
		var lastLoginIP *string
		var createdAt time.Time
		if err := rows.Scan(&s.ID, &s.Username, &s.Email, &s.Role, &s.TOTPEnabled, &s.IsActive, &lastLogin, &lastLoginIP, &createdAt); err != nil {
			continue
		}
		if lastLogin != nil {
			s.LastLogin = lastLogin.Format("2006-01-02 15:04")
		}
		if lastLoginIP != nil {
			s.LastLoginIP = *lastLoginIP
		}
		s.CreatedAt = createdAt.Format("2006-01-02")
		list = append(list, s)
	}
	if list == nil {
		list = []StaffItem{}
	}
	return c.JSON(list)
}

// UpdateStaffRole
func UpdateStaffRole(c *fiber.Ctx) error {
	id := c.Params("id")
	req := new(UpdateStaffRoleRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid body"})
	}
	validRoles := map[string]bool{"admin": true, "moderator": true, "support": true}
	if !validRoles[req.Role] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid role. Must be admin, moderator or support"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	actorUsername := c.Locals("adminUsername").(string)
	actorRole := c.Locals("adminRole").(string)

	cmd, err := database.Pool.Exec(ctx, "UPDATE admin_staff SET role = $1 WHERE id = $2", req.Role, id)
	if err != nil || cmd.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Staff member not found"})
	}

	LogAdminAction(ctx, actorUsername, actorRole, "staff.role_updated", "staff", id, map[string]interface{}{"new_role": req.Role})
	return c.JSON(fiber.Map{"message": "Staff role updated successfully", "role": req.Role})
}

// DeactivateStaff
func DeactivateStaff(c *fiber.Ctx) error {
	id := c.Params("id")
	actorID := c.Locals("adminStaffID").(string)
	if id == actorID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "You cannot deactivate your own account"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	actorUsername := c.Locals("adminUsername").(string)
	actorRole := c.Locals("adminRole").(string)

	cmd, err := database.Pool.Exec(ctx, "UPDATE admin_staff SET is_active = false WHERE id = $1", id)
	if err != nil || cmd.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Staff member not found"})
	}

	// Revoke all sessions
	_, _ = database.Pool.Exec(ctx, "UPDATE admin_sessions SET is_revoked = true WHERE staff_id = $1", id)

	LogAdminAction(ctx, actorUsername, actorRole, "staff.deactivated", "staff", id, map[string]interface{}{})
	return c.JSON(fiber.Map{"message": "Staff account deactivated and all sessions revoked"})
}

// ReactivateStaff
func ReactivateStaff(c *fiber.Ctx) error {
	id := c.Params("id")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	actorUsername := c.Locals("adminUsername").(string)
	actorRole := c.Locals("adminRole").(string)

	cmd, err := database.Pool.Exec(ctx, "UPDATE admin_staff SET is_active = true WHERE id = $1", id)
	if err != nil || cmd.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Staff member not found"})
	}
	LogAdminAction(ctx, actorUsername, actorRole, "staff.reactivated", "staff", id, map[string]interface{}{})
	return c.JSON(fiber.Map{"message": "Staff account reactivated"})
}

// ─── Shared audit log helper ───────────────────────────────────────────────────

func LogAdminAction(ctx context.Context, username, role, action, targetType, targetID string, details map[string]interface{}) {
	detailsJSON, _ := json.Marshal(details)
	_, err := database.Pool.Exec(ctx,
		`INSERT INTO admin_audit_logs (admin_username, admin_role, action, target_type, target_id, details)
		 VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
		username, role, action, targetType, targetID, string(detailsJSON),
	)
	if err != nil {
		log.Printf("[AdminAudit] Failed to log action %s by %s: %v", action, username, err)
	}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func quoteStrings(ss []string) []string {
	out := make([]string, len(ss))
	for i, s := range ss {
		escaped := strings.ReplaceAll(s, "\"", "\\\"")
		out[i] = "\"" + escaped + "\""
	}
	return out
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
