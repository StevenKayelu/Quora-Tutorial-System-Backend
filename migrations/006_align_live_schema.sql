-- =====================================
--  MIGRATION 006: align the live schema with the current backend
--  Run once, after 005, before (or together with) deploying the backend.
--  Take a backup first (from the OS shell, not inside mysql):
--    mysqldump -u <user> -p --single-transaction --routines --triggers <db> > backup.sql
--
--  Do NOT run 001 or 002 on live: their columns already exist there.
--
--  Every step checks the current shape first, so this file is safe to run
--  on a database that is already partly converted (live: subscriptions were
--  converted by hand on 2026-10-09) or fully converted (local dev), and safe
--  to run again. Run it with the mysql client, which stops at the first error:
--    mysql -u <user> -p <db> < migrations/006_align_live_schema.sql
-- =====================================

-- ---------------------------------------------------------------------
-- 1. user_course_subscription.user_id: user.u_user_id (VARCHAR) -> user.id (INT)
--    The old value is kept in legacy_u_user_id; drop it once verified.
--    Uniqueness becomes one row per user, course and term, which is what
--    the payment code assumes when a student renews for a new term.
-- ---------------------------------------------------------------------
SET @ucs_legacy := (
  SELECT COALESCE(MAX(DATA_TYPE = 'varchar'), 0)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user_course_subscription'
    AND COLUMN_NAME = 'user_id'
);

SET @sql := IF(@ucs_legacy,
  'ALTER TABLE user_course_subscription DROP FOREIGN KEY fk_subscription_user',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@ucs_legacy,
  'ALTER TABLE user_course_subscription DROP INDEX unique_user_course',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@ucs_legacy,
  'ALTER TABLE user_course_subscription
     CHANGE user_id legacy_u_user_id VARCHAR(7) NULL,
     ADD COLUMN user_id INT NULL AFTER id',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@ucs_legacy,
  'UPDATE user_course_subscription s
     JOIN user u ON u.u_user_id = s.legacy_u_user_id
     SET s.user_id = u.id',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Fails (and stops the script) if any row could not be mapped to a user
SET @sql := IF(@ucs_legacy,
  'ALTER TABLE user_course_subscription
     MODIFY user_id INT NOT NULL,
     ADD UNIQUE KEY unique_user_course (user_id, course_id, term_id),
     ADD CONSTRAINT fk_subscription_user FOREIGN KEY (user_id) REFERENCES user(id)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- 2. payment_transaction.user_id: same conversion
-- ---------------------------------------------------------------------
SET @pt_legacy := (
  SELECT COALESCE(MAX(DATA_TYPE = 'varchar'), 0)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payment_transaction'
    AND COLUMN_NAME = 'user_id'
);

SET @sql := IF(@pt_legacy,
  'ALTER TABLE payment_transaction DROP FOREIGN KEY fk_payment_user',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@pt_legacy,
  'ALTER TABLE payment_transaction DROP INDEX fk_payment_user',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@pt_legacy,
  'ALTER TABLE payment_transaction
     CHANGE user_id legacy_u_user_id VARCHAR(7) NULL,
     ADD COLUMN user_id INT NULL AFTER id',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@pt_legacy,
  'UPDATE payment_transaction p
     JOIN user u ON u.u_user_id = p.legacy_u_user_id
     SET p.user_id = u.id',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Fails (and stops the script) if any row could not be mapped to a user
SET @sql := IF(@pt_legacy,
  'ALTER TABLE payment_transaction
     MODIFY user_id INT NOT NULL,
     ADD KEY fk_payment_user (user_id),
     ADD CONSTRAINT fk_payment_user FOREIGN KEY (user_id) REFERENCES user(id)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- 3. topic.is_free (free-preview flag, read by the paywall).
--    Existing topics default to not free, which is how they behave today.
-- ---------------------------------------------------------------------
SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'topic' AND COLUMN_NAME = 'is_free') = 0,
  'ALTER TABLE topic ADD COLUMN is_free TINYINT(1) DEFAULT 0 AFTER topic_description',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- 4. topic_material.topic_id / term_id, copied from the material's subtopic
-- ---------------------------------------------------------------------
SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'topic_material' AND COLUMN_NAME = 'topic_id') = 0,
  'ALTER TABLE topic_material ADD COLUMN topic_id INT NULL AFTER id',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'topic_material' AND COLUMN_NAME = 'term_id') = 0,
  'ALTER TABLE topic_material ADD COLUMN term_id INT NULL AFTER subtopic_id',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'topic_material'
     AND COLUMN_NAME = 'topic_id' AND SEQ_IN_INDEX = 1) = 0,
  'ALTER TABLE topic_material ADD KEY idx_topic_material_topic (topic_id)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE topic_material tm
JOIN subtopic st ON st.id = tm.subtopic_id
JOIN topic t ON t.id = st.topic_id
SET tm.topic_id = st.topic_id,
    tm.term_id = t.term_id
WHERE tm.topic_id IS NULL OR tm.term_id IS NULL;

-- ---------------------------------------------------------------------
-- 5. user.u_mobile: the app accepts up to 15 characters
-- ---------------------------------------------------------------------
SET @sql := IF(
  (SELECT COALESCE(MAX(CHARACTER_MAXIMUM_LENGTH), 15) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'u_mobile') < 15,
  'ALTER TABLE user MODIFY COLUMN u_mobile VARCHAR(15) NULL',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- 6. Verify. Expect: both user_id columns int, is_free present,
--    topic_id/term_id present, u_mobile varchar(15), and 0 unlinked materials.
-- ---------------------------------------------------------------------
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND (
    (TABLE_NAME IN ('user_course_subscription', 'payment_transaction')
       AND COLUMN_NAME IN ('user_id', 'legacy_u_user_id'))
    OR (TABLE_NAME = 'topic' AND COLUMN_NAME = 'is_free')
    OR (TABLE_NAME = 'topic_material' AND COLUMN_NAME IN ('topic_id', 'term_id'))
    OR (TABLE_NAME = 'user' AND COLUMN_NAME = 'u_mobile')
  )
ORDER BY TABLE_NAME, COLUMN_NAME;

SELECT COUNT(*) AS materials_without_topic FROM topic_material WHERE topic_id IS NULL;

-- Later, once everything is verified in production:
--   ALTER TABLE user_course_subscription DROP COLUMN legacy_u_user_id;
--   ALTER TABLE payment_transaction DROP COLUMN legacy_u_user_id;
