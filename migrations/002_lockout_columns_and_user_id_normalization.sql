-- =====================================
--  MIGRATION 002: login lockout columns + user_id normalization
--  Run once, after 001, before deploying the matching backend code.
--  Take a backup first.
-- =====================================

-- 1. Columns used by AuthModel's lockout logic (missing from migration 001)
ALTER TABLE user
  ADD COLUMN failed_login_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN lockout_until DATETIME NULL;

-- 2. user_course_subscription.user_id must hold user.id (the INT primary key).
--    Admin-assigned rows were stored with user.u_user_id (e.g. 2500001), while
--    payment-created rows used user.id. Convert the u_user_id rows.
--    u_user_id values are 7 digits, so they cannot collide with real primary keys
--    unless the user table has over a million rows; check that first:
--      SELECT MAX(id) FROM user;
UPDATE user_course_subscription ucs
JOIN user u ON u.u_user_id = CAST(ucs.user_id AS CHAR)
SET ucs.user_id = u.id
WHERE ucs.user_id >= 1000000;

-- 3. Same convention for payment_transaction.user_id (normally already user.id,
--    since the frontend sent user.id; this only fixes stray u_user_id rows).
UPDATE payment_transaction pt
JOIN user u ON u.u_user_id = CAST(pt.user_id AS CHAR)
SET pt.user_id = u.id
WHERE pt.user_id >= 1000000;

-- 4. u_mobile was BIGINT in the original schema, which drops the leading 0 of
--    Zambian numbers (0971234567 -> 971234567). Store it as text and restore
--    the 0 on 9-digit values. Skip the UPDATE if the column was already text.
ALTER TABLE user MODIFY COLUMN u_mobile VARCHAR(15);
UPDATE user SET u_mobile = CONCAT('0', u_mobile) WHERE u_mobile REGEXP '^[1-9][0-9]{8}$';

-- 5. 'inactive' was written by older code but is not a valid u_status
UPDATE user SET u_status = 'unsubscribed' WHERE u_status NOT IN ('subscribed', 'unsubscribed') OR u_status IS NULL;
