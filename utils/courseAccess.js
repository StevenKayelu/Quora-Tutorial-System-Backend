import pool from "../config/db.js";

const isAdminUser = (user) => user?.role === "admin";

/**
 * Admins can access everything; students need an active, unexpired
 * subscription to the course. user.id is the INT primary key.
 */
export async function canAccessCourse(user, courseId) {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  if (!courseId) return false;

  const [rows] = await pool.query(
    `SELECT 1
     FROM user_course_subscription
     WHERE user_id = ?
       AND course_id = ?
       AND status = 'active'
       AND expires_at >= CURDATE()
     LIMIT 1`,
    [user.id, courseId]
  );
  return rows.length > 0;
}

/**
 * Topic materials hang off a subtopic (or directly off a topic); resolve the
 * owning course and whether the subtopic/topic is marked as a free preview.
 */
export async function getTopicMaterialAccessInfo(materialId) {
  const [rows] = await pool.query(
    `SELECT tm.*,
            t.course_id AS access_course_id,
            (COALESCE(st.is_free, 0) = 1 OR COALESCE(t.is_free, 0) = 1) AS access_is_free
     FROM topic_material tm
     LEFT JOIN subtopic st ON st.id = tm.subtopic_id
     LEFT JOIN topic t ON t.id = COALESCE(st.topic_id, tm.topic_id)
     WHERE tm.id = ?
     LIMIT 1`,
    [materialId]
  );
  return rows[0] || null;
}

/**
 * Stored file_url values are public R2 URLs; only admins should ever see
 * them. Everyone else goes through the signed preview/download endpoints.
 */
export function redactFileUrls(user, rows) {
  if (isAdminUser(user)) return rows;
  const redact = (row) =>
    row && row.file_url !== undefined
      ? { ...row, file_url: null, has_file: Boolean(row.file_url) }
      : row;
  return Array.isArray(rows) ? rows.map(redact) : redact(rows);
}
