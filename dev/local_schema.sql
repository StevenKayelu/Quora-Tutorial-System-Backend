-- =====================================================================
--  LOCAL DEVELOPMENT SCHEMA (not for production)
--  Reconstructed from the SQL the models actually run, because the
--  committed `database_schema` file is out of date and does not parse.
--
--  Convention: every *.user_id column holds user.id (the INT primary key),
--  never user.u_user_id (the 7-digit display ID).
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS
  payment_transaction_courses,
  payment_transaction,
  payment_gateway,
  free_preview_log,
  user_course_subscription,
  term_tutorial_sheet,
  term_test,
  topic_material,
  subtopic,
  topic,
  course_term,
  term,
  courses,
  school,
  contact_info,
  system_info,
  user;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE user (
  id INT AUTO_INCREMENT PRIMARY KEY,
  u_user_id VARCHAR(7) NOT NULL UNIQUE,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  gender VARCHAR(10),
  u_email VARCHAR(100) NOT NULL UNIQUE,
  u_mobile VARCHAR(15),
  u_password VARCHAR(255) NOT NULL,
  u_image VARCHAR(500),
  u_status ENUM('subscribed', 'unsubscribed') DEFAULT 'unsubscribed',
  u_role TINYINT(1) DEFAULT 0, -- 0 = student, 1 = admin
  email_verified_at DATETIME NULL,
  email_verification_token VARCHAR(255) NULL,
  email_verification_expires DATETIME NULL,
  password_reset_token VARCHAR(255) NULL,
  password_reset_expires DATETIME NULL,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  lockout_until DATETIME NULL,
  u_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  u_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_email_verification_token (email_verification_token),
  INDEX idx_user_password_reset_token (password_reset_token)
);

CREATE TABLE system_info (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  system_name VARCHAR(100),
  logo VARCHAR(500),
  favicon VARCHAR(500),
  coursera_images LONGTEXT,
  about_us TEXT,
  terms_and_conditions LONGTEXT,
  privacy_policy LONGTEXT,
  contact_email VARCHAR(100),
  contact_phone VARCHAR(20),
  social_links LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE contact_info (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact_email VARCHAR(100),
  contact_phone VARCHAR(20),
  whatsapp_number VARCHAR(20),
  contact_video_url VARCHAR(500),
  contact_video_caption VARCHAR(255),
  social_links LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE school (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_name VARCHAR(100) UNIQUE,
  school_description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_id INT,
  course_name VARCHAR(150) NOT NULL,
  course_description TEXT,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES school(id)
);

CREATE TABLE term (
  id INT AUTO_INCREMENT PRIMARY KEY,
  term_number INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE course_term (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  term_id INT NOT NULL,
  UNIQUE KEY uq_course_term (course_id, term_id),
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (term_id) REFERENCES term(id)
);

CREATE TABLE topic (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT,
  term_id INT,
  topic_title VARCHAR(255),
  topic_description TEXT,
  is_free TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (term_id) REFERENCES term(id)
);

CREATE TABLE subtopic (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic_id INT,
  subtopic_title VARCHAR(255),
  subtopic_description TEXT,
  is_free TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES topic(id)
);

CREATE TABLE topic_material (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic_id INT NULL,
  subtopic_id INT NULL,
  term_id INT NULL,
  material_type ENUM('note', 'video') NOT NULL,
  title VARCHAR(255),
  file_url TEXT,
  video_url TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (subtopic_id) REFERENCES subtopic(id)
);

CREATE TABLE term_test (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  term_id INT NOT NULL,
  test_type VARCHAR(30) NOT NULL,
  title VARCHAR(255),
  file_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (term_id) REFERENCES term(id)
);

CREATE TABLE term_tutorial_sheet (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  term_id INT NOT NULL,
  title VARCHAR(255),
  file_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (term_id) REFERENCES term(id)
);

CREATE TABLE user_course_subscription (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,           -- user.id
  course_id INT NOT NULL,
  term_id INT NULL,
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  status ENUM('active', 'inactive', 'expired', 'cancelled') DEFAULT 'active',
  source VARCHAR(50) DEFAULT 'payment',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id),
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (term_id) REFERENCES term(id)
);

CREATE TABLE free_preview_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  topic_id INT,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payment_gateway (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gateway_name VARCHAR(100) UNIQUE,
  gateway_description TEXT,
  api_key VARCHAR(255),
  api_secret VARCHAR(255),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE payment_transaction (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,           -- user.id
  course_id INT NULL,
  subscription_id INT NULL,
  gateway_id INT NOT NULL,
  transaction_id VARCHAR(100) NOT NULL UNIQUE,  -- MoneyUnify request id
  provider_transaction_id VARCHAR(100) NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'ZMW',
  payment_status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
  payment_method VARCHAR(50),
  response_data JSON,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id),
  FOREIGN KEY (gateway_id) REFERENCES payment_gateway(id)
);

CREATE TABLE payment_transaction_courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id VARCHAR(100) NOT NULL,
  course_id INT NOT NULL,
  UNIQUE KEY uq_tx_course (transaction_id, course_id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);
