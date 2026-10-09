-- LOCAL DEVELOPMENT SEED DATA (not for production)
-- Logins:  admin   2600001 / admin@local.test    password Admin@12345
--          student 2600002 / student@local.test  password Student@12345

INSERT INTO user (u_user_id, first_name, last_name, gender, u_email, u_mobile, u_password, u_role, u_status, email_verified_at) VALUES
  ('2600001', 'Local', 'Admin',   'male',   'admin@local.test',   '0970000001', '$2b$10$l9F22WG.odN1wSOKB1jrQ.M2ptMUfbkYZhO/Gq8fh6YRD4Tukr/lG', 1, 'unsubscribed', NOW()),
  ('2600002', 'Test',  'Student', 'female', 'student@local.test', '0970000002', '$2b$10$6ob0aMTEpnZKFEi5CsLmI.zJwuydnIdeZ4OpTTxkEm5pNvRI2KV7.', 0, 'unsubscribed', NOW());

INSERT INTO system_info (system_name, coursera_images, about_us, terms_and_conditions, privacy_policy, contact_email, contact_phone, social_links) VALUES
  ('Quora Tutorial System (local)', '[]', 'Local development instance.', 'Local terms.', 'Local privacy policy.', 'info@local.test', '0970000000', '[]');

INSERT INTO contact_info (contact_email, contact_phone, whatsapp_number, social_links) VALUES
  ('info@local.test', '0970000000', '0970000000', '[]');

INSERT INTO payment_gateway (gateway_name, gateway_description, is_active) VALUES
  ('moneyunify', 'MoneyUnify mobile money', 1);

-- One term that covers "today", so payments and subscriptions have an active term
INSERT INTO term (term_number, start_date, end_date) VALUES
  (1, DATE_SUB(CURDATE(), INTERVAL 30 DAY), DATE_ADD(CURDATE(), INTERVAL 60 DAY));

INSERT INTO school (school_name, school_description) VALUES
  ('School of Natural Sciences', 'Sample school for local testing');

INSERT INTO courses (school_id, course_name, course_description, amount) VALUES
  (1, 'Mathematics 101', 'Sample paid course', 150.00),
  (1, 'Physics 101',     'Second sample course', 200.00);

INSERT INTO course_term (course_id, term_id) VALUES (1, 1), (2, 1);

INSERT INTO topic (course_id, term_id, topic_title, topic_description) VALUES
  (1, 1, 'Algebra', 'Intro to algebra');

INSERT INTO subtopic (topic_id, subtopic_title, subtopic_description, is_free) VALUES
  (1, 'Linear equations (free preview)', 'Free subtopic', 1),
  (1, 'Quadratic equations',             'Paid subtopic', 0);

INSERT INTO topic_material (topic_id, subtopic_id, term_id, material_type, title, video_url, description) VALUES
  (1, 1, 1, 'video', 'Linear equations video',    'https://www.youtube.com/embed/dQw4w9WgXcQ', 'Free video'),
  (1, 2, 1, 'video', 'Quadratic equations video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'Paid video');
