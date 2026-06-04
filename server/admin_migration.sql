-- ============================================================
-- Felbic Admin Panel — Security Migration
-- Run this ONCE on your Supabase/PostgreSQL database
-- ============================================================

-- 1. Admin Staff Table (separate from users)
CREATE TABLE IF NOT EXISTS admin_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL DEFAULT 'PLACEHOLDER_WILL_BE_SET_ON_FIRST_LOGIN',
  role VARCHAR(20) NOT NULL DEFAULT 'moderator' CHECK (role IN ('admin', 'moderator', 'support')),
  totp_secret TEXT,
  totp_enabled BOOLEAN DEFAULT false,
  totp_verified BOOLEAN DEFAULT false,
  recovery_codes TEXT[],
  created_by UUID,
  is_active BOOLEAN DEFAULT true NOT NULL,
  last_login TIMESTAMPTZ,
  last_login_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Admin Sessions Table
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

-- Index for session lookups
CREATE INDEX IF NOT EXISTS idx_admin_sessions_staff_id ON admin_sessions(staff_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);

-- 3. Admin Audit Logs Table
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

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_username ON admin_audit_logs(admin_username);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON admin_audit_logs(created_at DESC);

-- 4. Platform State Table (DB-backed lockdown)
CREATE TABLE IF NOT EXISTS platform_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Default unlocked state
INSERT INTO platform_state (key, value, updated_by)
VALUES ('lockdown', '{"lockdown": false, "maintenance": false, "reason": ""}'::jsonb, 'system')
ON CONFLICT (key) DO NOTHING;

-- 5. Seed Initial Admin Account
-- IMPORTANT: The password will be set on first login
-- Username: gharvanta, Email: gharvanta@gmail.com
INSERT INTO admin_staff (username, email, password_hash, role, is_active)
VALUES (
  'gharvanta',
  'gharvanta@gmail.com',
  'PLACEHOLDER_WILL_BE_SET_ON_FIRST_LOGIN',
  'admin',
  true
)
ON CONFLICT (email) DO NOTHING;

-- 6. Ensure platform_settings table exists (for settings module)
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb
);

INSERT INTO platform_settings (key, value)
VALUES ('general', '{"newSignups":true,"creatorVerification":true,"autoPayouts":false,"liveMonitoring":true,"platformFee":20,"maxPpvPrice":999}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- VERIFY: Run these queries to check everything is correct
-- ============================================================
-- SELECT * FROM admin_staff;
-- SELECT * FROM platform_state;
-- SELECT * FROM admin_audit_logs LIMIT 5;
