-- =====================================
--  MIGRATION 008: amount paid on admin-assigned subscriptions
--  Run once, before deploying the matching backend code. Safe to re-run.
-- =====================================

-- When an admin assigns a course to a student, they can record what the
-- student paid outside the system. It is added to "Amount Paid" on the
-- membership card. NULL = nothing recorded (all existing rows).
SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_course_subscription' AND COLUMN_NAME = 'amount_paid') = 0,
  'ALTER TABLE user_course_subscription ADD COLUMN amount_paid DECIMAL(10,2) NULL AFTER source',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verify. Expect one row: amount_paid decimal(10,2) YES
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_course_subscription' AND COLUMN_NAME = 'amount_paid';
