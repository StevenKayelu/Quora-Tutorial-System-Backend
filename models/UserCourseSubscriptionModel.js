import pool from "../config/db.js";

export default class UserCourseSubscriptionModel {

  // =====================================
  // ADMIN: Get all users with active subscriptions
  // =====================================
  static async getUsersWithSubscriptions() {
    const [rows] = await pool.query(`
      SELECT
        u.u_user_id AS user_id,
        CONCAT(u.first_name, ' ', u.last_name) AS user_name,
        c.id AS course_id,
        c.course_name AS course_title,
        t.term_number,
        t.start_date,
        t.end_date,
        ucs.id AS subscription_id,
        ucs.status,
        ucs.subscribed_at,
        ucs.expires_at,
        ucs.source
      FROM user_course_subscription ucs
      JOIN user u 
        ON u.u_user_id = CAST(ucs.user_id AS UNSIGNED)
      JOIN courses c 
        ON c.id = ucs.course_id
      JOIN term t
        ON t.id = ucs.term_id
      ORDER BY u.u_user_id, ucs.subscribed_at DESC
    `);

    return rows;
  }

  // =====================================
  // ADMIN: Get active subscriptions for one user
  // =====================================
  static async getByUser(userId) {
    const [rows] = await pool.query(`
      SELECT
        ucs.id AS subscription_id,
        c.id AS course_id,
        c.course_name AS course_title,
        t.term_number,
        t.start_date,
        t.end_date,
        ucs.status,
        ucs.subscribed_at,
        ucs.expires_at,
        ucs.source
      FROM user_course_subscription ucs
      JOIN courses c ON c.id = ucs.course_id
      JOIN term t ON t.id = ucs.term_id
      WHERE ucs.user_id = ?
        AND ucs.status = 'active'
        AND ucs.expires_at >= CURDATE()  -- Only active, non-expired
      ORDER BY ucs.subscribed_at DESC
    `, [userId]);

    return rows;
  }

  // =====================================
  // CREATE subscription (sets expiry automatically)
  // =====================================
  static async create({ user_id, course_id, term_id, source = "admin" }) {

    // Get term end date
    const [termRows] = await pool.query(
      `SELECT end_date FROM term WHERE id = ?`,
      [term_id]
    );

    if (termRows.length === 0) {
      throw new Error("Invalid term_id");
    }

    const expires_at = termRows[0].end_date;

    const [result] = await pool.query(`
      INSERT INTO user_course_subscription
      (user_id, course_id, term_id, status, subscribed_at, expires_at, source)
      VALUES (?, ?, ?, 'active', NOW(), ?, ?)
    `, [user_id, course_id, term_id, expires_at, source]);

    return result.insertId;
  }

  // =====================================
  // UPDATE subscription status
  // =====================================
  static async updateStatus(id, status) {
    await pool.query(`
      UPDATE user_course_subscription
      SET status = ?, updated_at = NOW()
      WHERE id = ?
    `, [status, id]);
  }

  // =====================================
  // DELETE subscription
  // =====================================
  static async delete(id) {
    await pool.query(
      `DELETE FROM user_course_subscription WHERE id = ?`,
      [id]
    );
  }

  // =====================================
  // CHECK active subscription (respects expiry)
  // =====================================

  static async exists(user_id, course_id, term_id) {
  const [rows] = await pool.query(`
    SELECT 1
    FROM user_course_subscription
    WHERE user_id = ?
      AND course_id = ?
      AND term_id = ?
      AND expires_at >= CURDATE()
    LIMIT 1
  `, [user_id, course_id, term_id]);

  return rows.length > 0;
}

  // =====================================
  // AUTO-EXPIRE subscriptions
  // =====================================
  static async expireSubscriptions() {
    await pool.query(`
      UPDATE user_course_subscription
      SET status = 'expired'
      WHERE expires_at < CURDATE()
        AND status = 'active'
    `);
  }
}
