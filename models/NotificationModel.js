import pool from "../config/db.js";

// All queries are scoped to the owner (user.id)

export const getNotificationsForUser = async (userId, limit = 20) => {
  const [rows] = await pool.query(
    `SELECT id, type, title, message, school_id, course_id, term_id, item_id,
            is_read, created_at
     FROM notification
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    [userId, limit]
  );
  return rows;
};

export const countUnreadForUser = async (userId) => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS n FROM notification WHERE user_id = ? AND is_read = 0",
    [userId]
  );
  return Number(rows[0].n);
};

export const markRead = async (userId, id) => {
  const [result] = await pool.query(
    `UPDATE notification SET is_read = 1, read_at = NOW()
     WHERE id = ? AND user_id = ? AND is_read = 0`,
    [id, userId]
  );
  return result.affectedRows;
};

export const markAllRead = async (userId) => {
  const [result] = await pool.query(
    `UPDATE notification SET is_read = 1, read_at = NOW()
     WHERE user_id = ? AND is_read = 0`,
    [userId]
  );
  return result.affectedRows;
};
