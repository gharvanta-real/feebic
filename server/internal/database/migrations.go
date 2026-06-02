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
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('fan', 'creator');
    END IF;
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS poll JSONB;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS fundraiser JSONB;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reposted_from_id UUID REFERENCES posts(id) ON DELETE SET NULL;

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

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id_created_at ON post_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_user_id ON post_bookmarks(user_id);

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

CREATE INDEX IF NOT EXISTS idx_post_unlocks_user_id ON post_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_user_id ON post_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_favorites_user_id ON creator_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_story_views_user_id ON story_views(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_lists_creator_id ON custom_lists(creator_id);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
`

func RunMigrations() error {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	// Run table creation script
	if _, err := Pool.Exec(ctx, schemaSQL); err != nil {
		return err
	}
	log.Println("📁 Database schemas created or verified successfully")

	// Seed default data if users table is empty
	return seedDefaultData(ctx)
}

func seedDefaultData(ctx context.Context) error {
	var count int
	err := Pool.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		return err
	}

	if count > 0 {
		// Database already has data, bypass seeding
		return nil
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
	return nil

}
