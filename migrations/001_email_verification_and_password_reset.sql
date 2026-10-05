-- =====================================
--  MIGRATION 001: Email verification + password reset
--  Run once, before deploying the auth-hardening backend code.
-- =====================================

-- 1. Widen u_password. bcrypt hashes are always 60 characters, so the old
--    VARCHAR(50) column truncated (or, in strict mode, rejected) every hash.
ALTER TABLE user
  MODIFY COLUMN u_password VARCHAR(255);

-- 2. Verification / reset columns. Tokens are stored as SHA-256 hex hashes
--    (64 chars); the raw token only ever exists in the emailed link.
ALTER TABLE user
  ADD COLUMN email_verified_at DATETIME NULL,
  ADD COLUMN email_verification_token VARCHAR(255) NULL,
  ADD COLUMN email_verification_expires DATETIME NULL,
  ADD COLUMN password_reset_token VARCHAR(255) NULL,
  ADD COLUMN password_reset_expires DATETIME NULL;

-- 3. Token lookups
CREATE INDEX idx_user_email_verification_token ON user (email_verification_token);
CREATE INDEX idx_user_password_reset_token ON user (password_reset_token);

-- 4. Backfill: everyone registered before this migration counts as verified,
--    so nobody gets locked out once login starts requiring verification.
UPDATE user
SET email_verified_at = NOW()
WHERE email_verified_at IS NULL;
