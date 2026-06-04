package database

import (
	"context"
	"log"
	"time"
)

const schemaSQL = `
-- Create Roles Enum if it does not exist
DO $$
BEGIN
    CREATE TYPE user_role AS ENUM ('fan', 'creator');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END$$;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'fan',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    bio TEXT,
    avatar VARCHAR(512),
    cover_photo VARCHAR(512),
    location VARCHAR(255),
    website VARCHAR(255),
    sub_price NUMERIC(10, 2) DEFAULT 0.00,
    hidden BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Posts Table
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    media_urls TEXT[], -- Array of R2 links
    media_type VARCHAR(50),
    is_premium BOOLEAN DEFAULT FALSE,
    price NUMERIC(10, 2) DEFAULT 0.00,
    poll JSONB,
    fundraiser JSONB,
    reposted_from_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'published',
    visibility VARCHAR(30) DEFAULT 'public',
    archived_at TIMESTAMP DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feed_scores (
    post_id UUID PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
    score NUMERIC(12, 4) NOT NULL DEFAULT 0,
    recency_score NUMERIC(12, 4) NOT NULL DEFAULT 0,
    likes_score NUMERIC(12, 4) NOT NULL DEFAULT 0,
    comments_score NUMERIC(12, 4) NOT NULL DEFAULT 0,
    unlocks_score NUMERIC(12, 4) NOT NULL DEFAULT 0,
    creator_quality_score NUMERIC(12, 4) NOT NULL DEFAULT 0,
    reports_penalty NUMERIC(12, 4) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fan_id UUID REFERENCES users(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_fan_creator UNIQUE(fan_id, creator_id)
);

-- 5. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL, -- positive is deposit/earnings, negative is tip/purchase
    type VARCHAR(50) NOT NULL, -- tip, subscription, deposit, withdrawal
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    media_url VARCHAR(512),
    media_type VARCHAR(50),
    is_ppv BOOLEAN DEFAULT FALSE,
    price NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Stories Table
CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    story_url VARCHAR(512) NOT NULL,
    location VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Creator Vault Table
CREATE TABLE IF NOT EXISTS vault_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(512) NOT NULL,
    type VARCHAR(50) NOT NULL,
    size VARCHAR(50) NOT NULL,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Recipient
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Actor
    type VARCHAR(50) NOT NULL, -- subscribe, tip, like, comment
    text TEXT NOT NULL,
    amount NUMERIC(10, 2),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Post Likes Table
CREATE TABLE IF NOT EXISTS post_likes (
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id)
);

-- 11. Post Bookmarks Table
CREATE TABLE IF NOT EXISTS post_bookmarks (
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id)
);

-- 12. Post Comments Table
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Post Unlocks Table
CREATE TABLE IF NOT EXISTS post_unlocks (
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id)
);

-- 14. Post Reports Table
CREATE TABLE IF NOT EXISTS post_reports (
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id)
);

-- 15. Creator Favorites Table
CREATE TABLE IF NOT EXISTS creator_favorites (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, creator_id)
);

-- 16. User Blocks Table
CREATE TABLE IF NOT EXISTS user_blocks (
    blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (blocker_id, blocked_id)
);

-- 17. Story Views Table
CREATE TABLE IF NOT EXISTS story_views (
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (story_id, user_id)
);

-- 18. Custom Lists Table
CREATE TABLE IF NOT EXISTS custom_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 19. Custom List Members Table
CREATE TABLE IF NOT EXISTS custom_list_members (
    list_id UUID REFERENCES custom_lists(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (list_id, user_id)
);
-- 20. Cards Table
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    holder VARCHAR(255) NOT NULL,
    number VARCHAR(50) NOT NULL,
    expiry VARCHAR(10) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 21. Bank Accounts Table
CREATE TABLE IF NOT EXISTS bank_accounts (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bank_name VARCHAR(255) NOT NULL,
    account_holder VARCHAR(255) NOT NULL,
    routing_number VARCHAR(100) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 22. Live Streams Table
CREATE TABLE IF NOT EXISTS live_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    goal_title VARCHAR(255) DEFAULT '',
    goal_target NUMERIC(10, 2) DEFAULT 0.00,
    goal_current NUMERIC(10, 2) DEFAULT 0.00,
    viewer_count INT DEFAULT 0,
    heart_count INT DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'live',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP DEFAULT NULL
);

-- 23. Live Comments Table
CREATE TABLE IF NOT EXISTS live_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id UUID REFERENCES live_streams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_tip BOOLEAN DEFAULT FALSE,
    amount NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 24. Email Verification Codes Table
CREATE TABLE IF NOT EXISTS email_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    purpose VARCHAR(50) NOT NULL DEFAULT 'signup',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    attempts INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    consumed_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Apply column additions (moved after table definitions)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS poll JSONB;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS fundraiser JSONB;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reposted_from_id UUID REFERENCES posts(id) ON DELETE SET NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS publish_at TIMESTAMP DEFAULT NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS teaser_url VARCHAR(512) DEFAULT NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS target_list_id UUID REFERENCES custom_lists(id) ON DELETE SET NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'published';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS visibility VARCHAR(30) DEFAULT 'public';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP DEFAULT NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS calls_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS call_rate NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS discount_active BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS discount_percent INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_uploaded BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_name VARCHAR(255) DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_document_type VARCHAR(100) DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS biometric BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(40) DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Lifestyle';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Lifestyle';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags VARCHAR(50)[];

CREATE TABLE IF NOT EXISTS user_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL,
    dwell_time_seconds INT DEFAULT 0,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_interests (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    interests JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_interactions_composite ON user_interactions(user_id, category, interaction_type);

UPDATE profiles SET hidden = TRUE WHERE username = 'gharvanta';
UPDATE profiles SET category = 'Cosplay' WHERE username = 'amouranth';
UPDATE profiles SET category = 'Fitness' WHERE username = 'austinwolf';
UPDATE profiles SET category = 'Photography' WHERE username = 'demirose';
UPDATE profiles SET category = 'Lifestyle' WHERE username = 'lanarhoades';
UPDATE profiles SET category = 'Lifestyle' WHERE username = 'gharvanta';

UPDATE posts SET category = 'Photography' WHERE creator_id IN (SELECT user_id FROM profiles WHERE username = 'demirose');
UPDATE posts SET category = 'Cosplay' WHERE creator_id IN (SELECT user_id FROM profiles WHERE username = 'amouranth');
UPDATE posts SET category = 'Lifestyle' WHERE creator_id IN (SELECT user_id FROM profiles WHERE username = 'lanarhoades');
UPDATE posts SET category = 'Fitness' WHERE creator_id IN (SELECT user_id FROM profiles WHERE username = 'austinwolf');

UPDATE users
SET password_hash = 'external-auth-managed-placeholder-hash'
WHERE password_hash = 'cl' || 'erk-oauth-managed-placeholder-hash';

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id_created_at ON post_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_user_id ON post_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_post_unlocks_user_id ON post_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_user_id ON post_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_favorites_user_id ON creator_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_story_views_user_id ON story_views(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_lists_creator_id ON custom_lists(creator_id);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_status_started_at ON live_streams(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_comments_stream_id_created_at ON live_comments(stream_id, created_at);
CREATE INDEX IF NOT EXISTS idx_email_verification_codes_email_created_at ON email_verification_codes(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_status_visibility_created_at ON posts(status, visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_scores_score ON feed_scores(score DESC, updated_at DESC);

-- Admin Schema Additions
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS device VARCHAR(255) DEFAULT 'Web Browser';
ALTER TABLE users ADD COLUMN IF NOT EXISTS ip VARCHAR(100) DEFAULT '127.0.0.1';
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT 'Delhi, India';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS admin_appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) NOT NULL,
    type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    description TEXT,
    selfie_match_score NUMERIC(5, 2) DEFAULT 0.00,
    recovery_step INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL DEFAULT 'PLACEHOLDER_WILL_BE_SET_ON_FIRST_LOGIN',
    role VARCHAR(20) NOT NULL DEFAULT 'moderator' CHECK (role IN ('admin', 'moderator', 'support')),
    totp_secret TEXT,
    totp_enabled BOOLEAN DEFAULT false,
    totp_verified BOOLEAN DEFAULT false,
    recovery_codes TEXT[] DEFAULT '{}',
    created_by UUID,
    is_active BOOLEAN DEFAULT true NOT NULL,
    last_login TIMESTAMPTZ,
    last_login_ip TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES admin_staff(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_username VARCHAR(50) NOT NULL,
    admin_role VARCHAR(20) NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL DEFAULT 'system',
    target_id TEXT NOT NULL DEFAULT '',
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_state (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_settings (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_staff_id ON admin_sessions(staff_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_username ON admin_audit_logs(admin_username);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON admin_audit_logs(created_at DESC);

INSERT INTO platform_state (key, value, updated_by)
VALUES ('lockdown', '{"lockdown": false, "maintenance": false, "reason": ""}'::jsonb, 'system')
ON CONFLICT (key) DO NOTHING;
`

func RunMigrations() error {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	// Run table creation script
	if _, err := Pool.Exec(ctx, schemaSQL); err != nil {
		return err
	}
	log.Println("📁 Database schemas created or verified successfully")

	// Seed admin details if empty
	if err := seedAdminData(ctx); err != nil {
		log.Printf("⚠️ Warning: Failed to seed admin data: %v", err)
	}

	// Seed default data if users table is empty
	return seedDefaultData(ctx)
}

func seedAdminData(ctx context.Context) error {
	var staffCount int
	err := Pool.QueryRow(ctx, "SELECT COUNT(*) FROM admin_staff").Scan(&staffCount)
	if err == nil && staffCount == 0 {
		log.Println("Seeding initial admin staff account...")
		_, _ = Pool.Exec(ctx, `
			INSERT INTO admin_staff (username, email, password_hash, role, is_active)
			VALUES ('gharvanta', 'gharvanta@gmail.com', 'PLACEHOLDER_WILL_BE_SET_ON_FIRST_LOGIN', 'admin', true)
			ON CONFLICT (email) DO NOTHING
		`)
	}

	var appealsCount int
	err = Pool.QueryRow(ctx, "SELECT COUNT(*) FROM admin_appeals").Scan(&appealsCount)
	if err == nil && appealsCount == 0 {
		log.Println("🌱 Seeding default admin appeals...")
		_, _ = Pool.Exec(ctx, `
			INSERT INTO admin_appeals (username, type, description, selfie_match_score) VALUES
			('demirose', 'Hacked Account Recovery', 'My email address was changed to hacker_anonymous@xyz.ru. Please help me restore access.', 96.40),
			('austinwolf', 'VIP Verification Request', 'Requesting manual review for blue verification tick. ID uploaded.', 89.20)
		`)
	}

	var settingsCount int
	err = Pool.QueryRow(ctx, "SELECT COUNT(*) FROM platform_settings").Scan(&settingsCount)
	if err == nil && settingsCount == 0 {
		log.Println("🌱 Seeding default platform settings...")
		_, _ = Pool.Exec(ctx, `
			INSERT INTO platform_settings (key, value) VALUES
			('general', '{"newSignups": true, "creatorVerification": true, "autoPayouts": false, "liveMonitoring": true, "platformFee": 20, "maxPpvPrice": 999}'::jsonb)
		`)
	}

	// Seed bot users if they do not exist
	var botsCount int
	err = Pool.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE email LIKE '%@spam.com'").Scan(&botsCount)
	if err == nil && botsCount == 0 {
		log.Println("🌱 Seeding default bot accounts...")
		testHash := "$2a$10$tM6n66nfeZgM.oN/F0cMPO6F3r4x02uTir1tS3e0a.1/k.kK4K.Ku" // bcrypt for password123

		var bot1ID, bot2ID, bot3ID string
		_ = Pool.QueryRow(ctx, "INSERT INTO users (email, password_hash, role, status, ip, location, device) VALUES ('bot33@spam.com', $1, 'fan', 'active', '49.15.220.10', 'Kolkata, India', 'OnePlus 12') RETURNING id", testHash).Scan(&bot1ID)
		_ = Pool.QueryRow(ctx, "INSERT INTO users (email, password_hash, role, status, ip, location, device) VALUES ('bot9@spam.com', $1, 'fan', 'active', '103.24.120.45', 'Delhi, India', 'Xiaomi 13') RETURNING id", testHash).Scan(&bot2ID)
		_ = Pool.QueryRow(ctx, "INSERT INTO users (email, password_hash, role, status, ip, location, device) VALUES ('botalpha@spam.com', $1, 'fan', 'active', '185.220.101.4', 'St. Petersburg, Russia', 'Linux PC') RETURNING id", testHash).Scan(&bot3ID)

		if bot1ID != "" {
			_, _ = Pool.Exec(ctx, "INSERT INTO profiles (user_id, username, display_name, avatar, sub_price) VALUES ($1, 'spambot_33', 'Spam Bot 33', '/assets/39bc5c3eed51d62c1022c60686bb459a.png', 0)", bot1ID)
		}
		if bot2ID != "" {
			_, _ = Pool.Exec(ctx, "INSERT INTO profiles (user_id, username, display_name, avatar, sub_price) VALUES ($1, 'mass_follow_9', 'Mass Follower 9', '/assets/39bc5c3eed51d62c1022c60686bb459a.png', 0)", bot2ID)
		}
		if bot3ID != "" {
			_, _ = Pool.Exec(ctx, "INSERT INTO profiles (user_id, username, display_name, avatar, sub_price) VALUES ($1, 'dm_bot_alpha', 'DM Bot Alpha', '/assets/39bc5c3eed51d62c1022c60686bb459a.png', 0)", bot3ID)
		}
	}

	return nil
}

func seedDefaultData(ctx context.Context) error {
	var count int
	err := Pool.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		return err
	}

	if count > 0 {
		// Database already has users; still ensure the feed has baseline content.
		return seedDefaultContent(ctx)
	}

	log.Println("🌱 Seeding default creators and profiles into database...")

	// Default creators matching mockDb.ts config
	// Raw passwords will be hashed in auth package, but for seeding we will insert a generic password hash for testing.
	// bcrypt for "password123" is: $2a$10$tM6n66nfeZgM.oN/F0cMPO6F3r4x02uTir1tS3e0a.1/k.kK4K.Ku
	testHash := "$2a$10$tM6n66nfeZgM.oN/F0cMPO6F3r4x02uTir1tS3e0a.1/k.kK4K.Ku"

	creators := []struct {
		Email       string
		Username    string
		DisplayName string
		Bio         string
		Avatar      string
		CoverPhoto  string
		Location    string
		Website     string
		SubPrice    float64
	}{
		{
			Email:       "lana@creatorhub.com",
			Username:    "lanarhoades",
			DisplayName: "Lana Rhoades",
			Bio:         "Thank you for supporting me! 💕 Exclusive content every day.",
			Avatar:      "/assets/00dcbdc82244f0ba0d9f0e475c7e7780.png",
			CoverPhoto:  "/assets/082f4723389abb44b68b64dfc082268b.png",
			Location:    "Los Angeles, CA",
			Website:     "lanarhoades.fans",
			SubPrice:    14.99,
		},
		{
			Email:       "demi@creatorhub.com",
			Username:    "demirose",
			DisplayName: "Demi Rose",
			Bio:         "Spiritual being. ☀️ Grateful for this beautiful life. Sharing my travels, photosets, and love with you all. ❤️",
			Avatar:      "/assets/0c0bf4c58678d852ea7588ef1045309e.png",
			CoverPhoto:  "/assets/1b01065d7e887ce3d8b379aabd6221a2.png",
			Location:    "Ibiza, Spain",
			Website:     "demirose.fans",
			SubPrice:    14.99,
		},
		{
			Email:       "amouranth@creatorhub.com",
			Username:    "amouranth",
			DisplayName: "Amouranth",
			Bio:         "Gamer, ASMR artist, and cosplayer! 🕹️ Daily interactive streams, behind-the-scenes, and messages.",
			Avatar:      "/assets/31ccb1dded9dd42d60e1b0ab43ae8750.png",
			CoverPhoto:  "/assets/33835d122eba2ad097de797e914a7b1b.png",
			Location:    "Houston, USA",
			Website:     "amouranth.fans",
			SubPrice:    11.99,
		},
		{
			Email:       "austin@creatorhub.com",
			Username:    "austinwolf",
			DisplayName: "Austin Wolf",
			Bio:         "Certified bodybuilding coach & fitness trainer. Weekly exercise guides, tips, and full gym workouts! 💪🏋️‍♂️",
			Avatar:      "/assets/5dc72593d711173af1fe7ab74be0fa56.png",
			CoverPhoto:  "/assets/2e276540ed6f162458a34e8dc8f3f271.png",
			Location:    "Los Angeles, USA",
			Website:     "austinwolf.fitness",
			SubPrice:    9.99,
		},
	}

	for _, c := range creators {
		var userID string
		err := Pool.QueryRow(ctx,
			"INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'creator') RETURNING id",
			c.Email, testHash,
		).Scan(&userID)
		if err != nil {
			return err
		}

		_, err = Pool.Exec(ctx,
			`INSERT INTO profiles (user_id, username, display_name, bio, avatar, cover_photo, location, website, sub_price) 
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			userID, c.Username, c.DisplayName, c.Bio, c.Avatar, c.CoverPhoto, c.Location, c.Website, c.SubPrice,
		)
		if err != nil {
			return err
		}
	}

	// Seed one default fan account
	var fanID string
	err = Pool.QueryRow(ctx,
		"INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'fan') RETURNING id",
		"fan@creatorhub.com", testHash,
	).Scan(&fanID)
	if err != nil {
		return err
	}

	_, err = Pool.Exec(ctx,
		`INSERT INTO profiles (user_id, username, display_name, bio, avatar, cover_photo, location, website, sub_price) 
		 VALUES ($1, 'sam_fan', 'Sam Fan', 'Supporter and follower of premium digital creators.', 
		         '/assets/39bc5c3eed51d62c1022c60686bb459a.png', '/assets/cb15617a79d7713ffa4a6de36f808a76.png', 
		         'New York, USA', '', 0.00)`,
		fanID,
	)
	if err != nil {
		return err
	}

	// Give the fan an initial wallet deposit of $450.00
	_, err = Pool.Exec(ctx,
		"INSERT INTO transactions (user_id, amount, type, title) VALUES ($1, 450.00, 'deposit', 'Initial starting balance')",
		fanID,
	)
	if err != nil {
		return err
	}

	log.Println("🌱 Database seeding complete successfully.")
	return seedDefaultContent(ctx)

}

func seedDefaultContent(ctx context.Context) error {
	if err := seedDefaultPosts(ctx); err != nil {
		return err
	}
	return seedDefaultStories(ctx)
}

func seedDefaultPosts(ctx context.Context) error {
	var count int
	if err := Pool.QueryRow(ctx, "SELECT COUNT(*) FROM posts").Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	log.Println("Seeding default public feed posts...")

	_, err := Pool.Exec(ctx, `
		INSERT INTO posts (creator_id, content, media_urls, media_type, is_premium, price)
		SELECT u.id, seed.content, seed.media_urls, seed.media_type, seed.is_premium, seed.price
		FROM (
			VALUES
				('demirose', 'Golden-hour set from today. New travel drops are live now.', ARRAY['/assets/1b01065d7e887ce3d8b379aabd6221a2.png']::text[], 'image', FALSE, 0.00),
				('amouranth', 'Behind the stream setup. Full cosplay album is ready for subscribers.', ARRAY['/assets/33835d122eba2ad097de797e914a7b1b.png']::text[], 'image', FALSE, 0.00),
				('lanarhoades', 'Fresh shoot preview. Premium gallery coming tonight.', ARRAY['/assets/082f4723389abb44b68b64dfc082268b.png']::text[], 'image', TRUE, 399.00),
				('austinwolf', 'Push day progress check. Save this routine for your next gym session.', ARRAY['/assets/2e276540ed6f162458a34e8dc8f3f271.png']::text[], 'image', FALSE, 0.00)
		) AS seed(username, content, media_urls, media_type, is_premium, price)
		JOIN profiles p ON p.username = seed.username
		JOIN users u ON u.id = p.user_id
	`)
	if err != nil {
		return err
	}

	log.Println("🌱 Seeding default post reports...")
	_, _ = Pool.Exec(ctx, `
		INSERT INTO post_reports (post_id, user_id, reason)
		SELECT p.id, u.id, 'Suspected adult content violation'
		FROM posts p
		CROSS JOIN (SELECT user_id as id FROM profiles WHERE username = 'sam_fan' LIMIT 1) u
		WHERE p.content LIKE '%shoot%'
		ON CONFLICT DO NOTHING
	`)
	_, _ = Pool.Exec(ctx, `
		INSERT INTO post_reports (post_id, user_id, reason)
		SELECT p.id, u.id, 'External monetization links in post'
		FROM posts p
		CROSS JOIN (SELECT user_id as id FROM profiles WHERE username = 'sam_fan' LIMIT 1) u
		WHERE p.content LIKE '%travel%'
		ON CONFLICT DO NOTHING
	`)

	// Let's seed comments
	_, _ = Pool.Exec(ctx, `
		INSERT INTO post_comments (post_id, user_id, text)
		SELECT p.id, u.id, 'Is this content fully compliant?'
		FROM posts p
		CROSS JOIN (SELECT user_id as id FROM profiles WHERE username = 'sam_fan' LIMIT 1) u
		WHERE p.content LIKE '%shoot%'
	`)
	_, _ = Pool.Exec(ctx, `
		INSERT INTO post_comments (post_id, user_id, text)
		SELECT p.id, u.id, 'Love the background!'
		FROM posts p
		CROSS JOIN (SELECT user_id as id FROM profiles WHERE username = 'sam_fan' LIMIT 1) u
		WHERE p.content LIKE '%travel%'
	`)

	return nil
}

func seedDefaultStories(ctx context.Context) error {
	var count int
	if err := Pool.QueryRow(ctx, "SELECT COUNT(*) FROM stories WHERE expires_at > NOW()").Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	log.Println("Seeding default active stories...")

	_, err := Pool.Exec(ctx, `
		INSERT INTO stories (creator_id, story_url, location, expires_at)
		SELECT u.id, seed.story_url, seed.location, NOW() + INTERVAL '24 hours'
		FROM (
			VALUES
				('demirose', '/assets/0c0bf4c58678d852ea7588ef1045309e.png', 'Ibiza'),
				('amouranth', '/assets/31ccb1dded9dd42d60e1b0ab43ae8750.png', 'Studio'),
				('austinwolf', '/assets/5dc72593d711173af1fe7ab74be0fa56.png', 'Los Angeles')
		) AS seed(username, story_url, location)
		JOIN profiles p ON p.username = seed.username
		JOIN users u ON u.id = p.user_id
	`)
	return err
}
