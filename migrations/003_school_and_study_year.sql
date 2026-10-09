-- =====================================
--  MIGRATION 003: user school + year of study
--  Run once, after 002, before deploying the matching backend code.
--  Take a backup first.
-- =====================================

-- 1. Admin-managed list of study years shown on registration
CREATE TABLE IF NOT EXISTS study_year (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_study_year_name (name)
) ENGINE=InnoDB;

INSERT IGNORE INTO study_year (name, sort_order) VALUES
  ('Year 1', 1),
  ('Year 2', 2),
  ('Year 3', 3),
  ('Year 4', 4);

-- 2. Each user's school and year. Nullable so existing accounts stay valid;
--    they are asked to fill these in on their next login.
ALTER TABLE user
  ADD COLUMN school_id INT NULL,
  ADD COLUMN study_year_id INT NULL,
  ADD CONSTRAINT fk_user_school FOREIGN KEY (school_id)
    REFERENCES school(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_user_study_year FOREIGN KEY (study_year_id)
    REFERENCES study_year(id) ON DELETE SET NULL;
