-- =====================================
--  MIGRATION 002: Account lockout on repeated failed logins
--  Run after 001_email_verification_and_password_reset.sql.
-- =====================================

ALTER TABLE user
  ADD COLUMN failed_login_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN lockout_until DATETIME NULL;

CREATE INDEX idx_user_lockout_until ON user (lockout_until);
