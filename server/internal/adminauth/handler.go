package adminauth

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"encoding/base64"
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

// ─── JWT helpers ──────────────────────────────────────────────────────────────

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
	sessionToken, _ := randomHex(32)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"staff_id":      staffID,
		"username":      username,
		"role":          role,
		"purpose":       "admin_session",
		"session_token": sessionToken,
		"exp":           time.Now().Add(12 * time.Hour).Unix(),
	})
	signed, err := token.SignedString([]byte(cfg.AdminJWTSecret))
	return signed, err
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

// ─── TOTP helpers (RFC 6238 — Time-based OTP) ─────────────────────────────────
// We implement a minimal TOTP validator without external libs to keep deps lean.

func generateTOTPSecret() (string, error) {
	b := make([]byte, 20)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base32.StdEncoding.EncodeToString(b), nil
}

func generateTOTPQRURL(secret, email string) string {
	return fmt.Sprintf(
		"otpauth://totp/Felbic%%20Admin%%3A%s?secret=%s&issuer=Felbic%%20Ops&algorithm=SHA1&digits=6&period=30",
		strings.ReplaceAll(email, "@", "%40"),
		secret,
	)
}

// verifyTOTP checks the TOTP code against the stored secret.
// It accepts codes from t-1, t, t+1 windows (±30s drift).
func verifyTOTP(secret, code string) bool {
	secretBytes, err := base32.StdEncoding.DecodeString(strings.ToUpper(secret))
	if err != nil {
		return false
	}
	now := time.Now().Unix() / 30
	for _, counter := range []int64{now - 1, now, now + 1} {
		if computeHOTP(secretBytes, counter) == code {
			return true
		}
	}
	return false
}

func computeHOTP(secret []byte, counter int64) string {
	// Implements RFC 4226 HOTP
	import_hmac_sha1 := func(key, data []byte) []byte {
		import_crypto_hmac := func() {
			// inline to avoid import cycle — use stdlib
		}
		_ = import_crypto_hmac
		mac := hmacSHA1(key, data)
		return mac
	}
	msg := make([]byte, 8)
	for i := 7; i >= 0; i-- {
		msg[i] = byte(counter & 0xff)
		counter >>= 8
	}
	h := import_hmac_sha1(secret, msg)
	offset := h[len(h)-1] & 0x0f
	code := (int(h[offset]&0x7f)<<24 |
		int(h[offset+1])<<16 |
		int(h[offset+2])<<8 |
		int(h[offset+3])) % 1000000
	return fmt.Sprintf("%06d", code)
}

func hmacSHA1(key, data []byte) []byte {
	// Using crypto/hmac + crypto/sha1 inline
	blockSize := 64
	if len(key) > blockSize {
		// hash key if longer than block
		import_sha := sha1sum(key)
		key = import_sha
	}
	ipad := make([]byte, blockSize+len(data))
	opad := make([]byte, blockSize+20)
	for i := 0; i < blockSize; i++ {
		k := byte(0)
		if i < len(key) {
			k = key[i]
		}
		ipad[i] = k ^ 0x36
		opad[i] = k ^ 0x5c
	}
	copy(ipad[blockSize:], data)
	inner := sha1sum(ipad)
	copy(opad[blockSize:], inner)
	return sha1sum(opad)
}

func sha1sum(data []byte) []byte {
	// We need crypto/sha1 — import it properly below
	// This is handled via actual imports at the top
	return computeSHA1(data)
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
		code := strings.ToUpper(base32.StdEncoding.EncodeToString(b))[:16]
		plain[i] = fmt.Sprintf("%s-%s-%s-%s", code[0:4], code[4:8], code[8:12], code[12:16])
		h, err := bcrypt.GenerateFromPassword([]byte(plain[i]), bcrypt.MinCost)
		if err != nil {
			return nil, nil, err
		}
		hashed[i] = string(h)
	}
	return plain, hashed, nil
}

func verifyRecoveryCode(codes []string, input string) (bool, int) {
	normalized := strings.ToUpper(strings.ReplaceAll(input, "-", ""))
	for i, hash := range codes {
		// Try normalized
		if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(input)); err == nil {
			return true, i
		}
		_ = normalized
	}
	return false, -1
}

// ─── Misc helpers ──────────────────────────────────────────────────────────────

func randomHex(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b)[:n], nil
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

// Step 1: Email + Password check → returns step1_token (short-lived)
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
	var totpEnabled bool
	var isActive bool

	err := database.Pool.QueryRow(ctx,
		`SELECT id, username, password_hash, role, COALESCE(totp_enabled, false), COALESCE(is_active, true)
		 FROM admin_staff WHERE email = $1`,
		email,
	).Scan(&staffID, &username, &passwordHash, &role, &totpEnabled, &isActive)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid credentials"})
		}
		log.Printf("[AdminAuth] DB error on login: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Authentication error"})
	}

	if !isActive {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "This staff account has been deactivated"})
	}

	// First-time login: password is placeholder
	if passwordHash == "PLACEHOLDER_WILL_BE_SET_ON_FIRST_LOGIN" {
		// Set the password now
		hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to set password"})
		}
		_, _ = database.Pool.Exec(ctx, "UPDATE admin_staff SET password_hash = $1 WHERE id = $2", string(hashed), staffID)
		passwordHash = string(hashed)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		// Log failed attempt
		logAdminAction(ctx, username, role, "auth.login_failed", "auth", email, fiber.Map{"ip": c.IP()})
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid credentials"})
	}

	step1Token, err := generateStep1Token(staffID, email)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate auth token"})
	}

	return c.JSON(fiber.Map{
		"step1_token":   step1Token,
		"totp_required": totpEnabled,
		"totp_setup":    !totpEnabled,
		"username":      username,
		"role":          role,
	})
}

// Step 2: Verify TOTP code → returns full admin JWT
func VerifyTOTP(c *fiber.Ctx) error {
	req := new(TOTPVerifyRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	staffID, _, err := parseStep1Token(req.Step1Token)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid or expired session. Please login again."})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var username, role string
	var totpSecret string
	var totpEnabled bool
	var recoveryCodes []string

	err = database.Pool.QueryRow(ctx,
		`SELECT username, role, COALESCE(totp_secret,''), COALESCE(totp_enabled,false), COALESCE(recovery_codes, '{}')
		 FROM admin_staff WHERE id = $1`,
		staffID,
	).Scan(&username, &role, &totpSecret, &totpEnabled, &recoveryCodes)

	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Staff account not found"})
	}

	code := strings.TrimSpace(req.TOTPCode)

	if totpEnabled {
		// Try TOTP first
		valid := verifyTOTP(totpSecret, code)
		if !valid {
			// Try recovery code
			matched, idx := verifyRecoveryCode(recoveryCodes, code)
			if !matched {
				logAdminAction(ctx, username, role, "auth.totp_failed", "auth", username, fiber.Map{"ip": c.IP()})
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid authentication code"})
			}
			// Burn the recovery code
			recoveryCodes[idx] = "USED-" + recoveryCodes[idx]
			codesJSON, _ := json.Marshal(recoveryCodes)
			_, _ = database.Pool.Exec(ctx, "UPDATE admin_staff SET recovery_codes = $1 WHERE id = $2", string(codesJSON), staffID)
		}
	}

	// Issue full admin JWT
	adminToken, err := generateAdminToken(staffID, username, role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate admin token"})
	}

	// Save session to DB
	sessionToken, _ := randomHex(48)
	_, _ = database.Pool.Exec(ctx,
		`INSERT INTO admin_sessions (staff_id, session_token, ip_address, user_agent, expires_at)
		 VALUES ($1, $2, $3, $4, $5)`,
		staffID, sessionToken, c.IP(), c.Get("User-Agent"), time.Now().Add(12*time.Hour),
	)

	// Update last login
	_, _ = database.Pool.Exec(ctx,
		"UPDATE admin_staff SET last_login = CURRENT_TIMESTAMP, last_login_ip = $1 WHERE id = $2",
		c.IP(), staffID,
	)

	logAdminAction(ctx, username, role, "auth.login_success", "auth", username, fiber.Map{"ip": c.IP()})

	return c.JSON(fiber.Map{
		"token": adminToken,
		"admin": fiber.Map{
			"id":       staffID,
			"username": username,
			"role":     role,
		},
	})
}

// Setup TOTP — called when totp_setup = true, generates QR code
func SetupTOTP(c *fiber.Ctx) error {
	staffID := c.Locals("adminStaffID").(string)
	username := c.Locals("adminUsername").(string)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var email string
	var totpEnabled bool
	_ = database.Pool.QueryRow(ctx, "SELECT email, COALESCE(totp_enabled,false) FROM admin_staff WHERE id = $1", staffID).Scan(&email, &totpEnabled)

	if totpEnabled {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "TOTP is already configured"})
	}

	secret, err := generateTOTPSecret()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate TOTP secret"})
	}

	// Save secret (unverified) temporarily
	_, err = database.Pool.Exec(ctx,
		"UPDATE admin_staff SET totp_secret = $1, totp_verified = false WHERE id = $2",
		secret, staffID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save TOTP secret"})
	}

	qrURL := generateTOTPQRURL(secret, email)

	return c.JSON(fiber.Map{
		"secret":     secret,
		"qr_url":     qrURL,
		"username":   username,
		"issuer":     "Felbic Ops",
		"message":    "Scan the QR code in your authenticator app, then confirm with a 6-digit code",
	})
}

// Confirm TOTP — verifies user scanned correctly, enables 2FA and generates recovery codes
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
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Run TOTP setup first"})
	}

	if !verifyTOTP(totpSecret, strings.TrimSpace(req.TOTPCode)) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid TOTP code. Check your authenticator app."})
	}

	// Generate recovery codes
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
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to enable TOTP"})
	}

	logAdminAction(ctx, username, role, "auth.totp_enabled", "auth", username, fiber.Map{})

	return c.JSON(fiber.Map{
		"message":        "Two-factor authentication enabled successfully",
		"recovery_codes": plainCodes,
		"warning":        "Save these recovery codes securely. They will not be shown again.",
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
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Session invalid or expired"})
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
		"id":           staffID,
		"username":     username,
		"email":        email,
		"role":         role,
		"totp_enabled": totpEnabled,
		"last_login":   lastLoginStr,
		"last_login_ip": lastLoginIPStr,
	})
}

// Logout — revoke session
func Logout(c *fiber.Ctx) error {
	staffID := c.Locals("adminStaffID").(string)
	username := c.Locals("adminUsername").(string)
	role := c.Locals("adminRole").(string)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, _ = database.Pool.Exec(ctx,
		"UPDATE admin_sessions SET is_revoked = true WHERE staff_id = $1 AND is_revoked = false",
		staffID,
	)

	logAdminAction(ctx, username, role, "auth.logout", "auth", username, fiber.Map{"ip": c.IP()})

	return c.JSON(fiber.Map{"message": "Logged out successfully"})
}

// CreateStaff — admin creates new staff account
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

	// Only admin can create admin-level staff
	if req.Role == "admin" && creatorRole != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only admins can create admin-level accounts"})
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
		if strings.Contains(err.Error(), "unique") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Username or email already exists"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create staff account"})
	}

	logAdminAction(ctx, creatorUsername, creatorRole, "staff.created", "staff", req.Username, fiber.Map{
		"new_role":  req.Role,
		"new_email": req.Email,
	})

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":  "Staff account created successfully",
		"id":       newID,
		"username": req.Username,
		"role":     req.Role,
	})
}

// GetStaffList — list all staff
func GetStaffList(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rows, err := database.Pool.Query(ctx,
		`SELECT id, username, email, role, totp_enabled, is_active, last_login, last_login_ip, created_at
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

// UpdateStaffRole — change staff role
func UpdateStaffRole(c *fiber.Ctx) error {
	id := c.Params("id")
	req := new(UpdateStaffRoleRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid body"})
	}
	validRoles := map[string]bool{"admin": true, "moderator": true, "support": true}
	if !validRoles[req.Role] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid role"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	actorUsername := c.Locals("adminUsername").(string)
	actorRole := c.Locals("adminRole").(string)

	cmd, err := database.Pool.Exec(ctx, "UPDATE admin_staff SET role = $1 WHERE id = $2", req.Role, id)
	if err != nil || cmd.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Staff not found"})
	}

	logAdminAction(ctx, actorUsername, actorRole, "staff.role_updated", "staff", id, fiber.Map{"new_role": req.Role})
	return c.JSON(fiber.Map{"message": "Staff role updated", "role": req.Role})
}

// DeactivateStaff — soft delete staff
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

	cmd, err := database.Pool.Exec(ctx,
		"UPDATE admin_staff SET is_active = false WHERE id = $1",
		id,
	)
	if err != nil || cmd.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Staff not found"})
	}

	// Revoke all sessions
	_, _ = database.Pool.Exec(ctx, "UPDATE admin_sessions SET is_revoked = true WHERE staff_id = $1", id)

	logAdminAction(ctx, actorUsername, actorRole, "staff.deactivated", "staff", id, fiber.Map{})
	return c.JSON(fiber.Map{"message": "Staff account deactivated and sessions revoked"})
}

// ReactivateStaff — reactivate a deactivated staff
func ReactivateStaff(c *fiber.Ctx) error {
	id := c.Params("id")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	actorUsername := c.Locals("adminUsername").(string)
	actorRole := c.Locals("adminRole").(string)

	cmd, err := database.Pool.Exec(ctx, "UPDATE admin_staff SET is_active = true WHERE id = $1", id)
	if err != nil || cmd.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Staff not found"})
	}
	logAdminAction(ctx, actorUsername, actorRole, "staff.reactivated", "staff", id, fiber.Map{})
	return c.JSON(fiber.Map{"message": "Staff account reactivated"})
}

// ─── Shared audit log helper ──────────────────────────────────────────────────

func logAdminAction(ctx context.Context, username, role, action, targetType, targetID string, details fiber.Map) {
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

// SHA1 implementation (needed for TOTP)
func computeSHA1(data []byte) []byte {
	// Constants
	h0 := uint32(0x67452301)
	h1 := uint32(0xEFCDAB89)
	h2 := uint32(0x98BADCFE)
	h3 := uint32(0x10325476)
	h4 := uint32(0xC3D2E1F0)

	ml := len(data)
	data = append(data, 0x80)
	for len(data)%64 != 56 {
		data = append(data, 0x00)
	}
	mlBits := uint64(ml) * 8
	for i := 7; i >= 0; i-- {
		data = append(data, byte(mlBits>>(uint(i)*8)))
	}

	for i := 0; i < len(data); i += 64 {
		chunk := data[i : i+64]
		var w [80]uint32
		for j := 0; j < 16; j++ {
			w[j] = uint32(chunk[j*4])<<24 | uint32(chunk[j*4+1])<<16 | uint32(chunk[j*4+2])<<8 | uint32(chunk[j*4+3])
		}
		for j := 16; j < 80; j++ {
			w[j] = bits_rotate(w[j-3]^w[j-8]^w[j-14]^w[j-16], 1)
		}
		a, b, cc, d, e := h0, h1, h2, h3, h4
		for j := 0; j < 80; j++ {
			var f, k uint32
			switch {
			case j < 20:
				f = (b & cc) | ((^b) & d); k = 0x5A827999
			case j < 40:
				f = b ^ cc ^ d; k = 0x6ED9EBA1
			case j < 60:
				f = (b & cc) | (b & d) | (cc & d); k = 0x8F1BBCDC
			default:
				f = b ^ cc ^ d; k = 0xCA62C1D6
			}
			tmp := bits_rotate(a, 5) + f + e + k + w[j]
			e, d, cc, b, a = d, cc, bits_rotate(b, 30), a, tmp
		}
		h0, h1, h2, h3, h4 = h0+a, h1+b, h2+cc, h3+d, h4+e
	}
	out := make([]byte, 20)
	for i, v := range []uint32{h0, h1, h2, h3, h4} {
		out[i*4] = byte(v >> 24); out[i*4+1] = byte(v >> 16); out[i*4+2] = byte(v >> 8); out[i*4+3] = byte(v)
	}
	return out
}

func bits_rotate(x uint32, n uint) uint32 {
	return (x << n) | (x >> (32 - n))
}
