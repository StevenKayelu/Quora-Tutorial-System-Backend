-- =====================================
--  MIGRATION 007: student rules PDF
--  Run once, after 006, before deploying the matching backend code.
--  Safe to re-run.
-- =====================================

-- The admin uploads one rules PDF; students see the latest one on their
-- dashboard. Replacing the file replaces the row (and its stored file).
CREATE TABLE IF NOT EXISTS student_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  uploaded_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_student_rules_user FOREIGN KEY (uploaded_by)
    REFERENCES user(id) ON DELETE SET NULL
) ENGINE=InnoDB;
