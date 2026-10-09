-- =====================================
--  MIGRATION 004: in-app upload notifications
--  Run once, after 003, before deploying the matching backend code.
-- =====================================

-- One row per user per uploaded item (video, note, test, tutorial sheet)
-- in a course they are actively subscribed to. user_id is user.id.
CREATE TABLE IF NOT EXISTS notification (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('video', 'note', 'test', 'tutorial') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message VARCHAR(500) NOT NULL,
  school_id INT NULL,
  course_id INT NOT NULL,
  term_id INT NULL,
  item_id INT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  read_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notification_user (user_id, is_read, created_at),
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id)
    REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB;
