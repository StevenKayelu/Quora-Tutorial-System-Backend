-- =====================================
--  MIGRATION 005: share a course with more than one school
--  Run once, after 004, before deploying the matching backend code.
-- =====================================

-- courses.school_id stays the course's main school. This table lists the
-- additional schools the same course (and all its materials) is offered at.
CREATE TABLE IF NOT EXISTS course_school (
  course_id INT NOT NULL,
  school_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (course_id, school_id),
  KEY idx_course_school_school (school_id),
  CONSTRAINT fk_course_school_course FOREIGN KEY (course_id)
    REFERENCES courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_course_school_school FOREIGN KEY (school_id)
    REFERENCES school(id) ON DELETE CASCADE
) ENGINE=InnoDB;
