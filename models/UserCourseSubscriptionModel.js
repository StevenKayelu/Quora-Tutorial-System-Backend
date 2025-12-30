import pool from "../config/db.js";

export default class UserCourseSubscriptionModel {

  // ================================
  // ADMIN: Get all users with their subscriptions
  // ================================
  static async getUsersWithSubscriptions() {
    const [rows] = await pool.query(`
      SELECT
        u.u_user_id                 AS user_id,
        CONCAT(u.first_name, ' ', u.last_name) AS user_name,
        c.id                        AS course_id,
        c.course_name               AS course_title,
        ucs.id                      AS subscription_id,
        ucs.status,
        ucs.subscribed_at,
        ucs.source
      FROM user_course_subscription ucs
      JOIN user u 
        ON u.u_user_id = CAST(ucs.user_id AS UNSIGNED)
      JOIN courses c 
        ON c.id = ucs.course_id
      ORDER BY u.u_user_id, ucs.subscribed_at DESC
    `);

    return rows;
  }

  // ================================
  // ADMIN: Get subscriptions for one user
  // ================================
  static async getByUser(userId) {
    const [rows] = await pool.query(`
      SELECT
        ucs.id           AS subscription_id,
        c.id             AS course_id,
        c.course_name    AS course_title,
        ucs.status,
        ucs.subscribed_at,
        ucs.source
      FROM user_course_subscription ucs
      JOIN courses c ON c.id = ucs.course_id
      WHERE ucs.user_id = ?
      ORDER BY ucs.subscribed_at DESC
    `, [userId]);

    return rows;
  }

  // ================================
  // CREATE subscription (admin or payment)
  // ================================
  static async create({ user_id, course_id, source = "admin" }) {
    const [result] = await pool.query(`
      INSERT INTO user_course_subscription
      (user_id, course_id, status, subscribed_at, source)
      VALUES (?, ?, 'active', NOW(), ?)
    `, [user_id, course_id, source]);

    return result.insertId;
  }

  // ================================
  // UPDATE subscription status
  // ================================
  static async updateStatus(id, status) {
    await pool.query(`
      UPDATE user_course_subscription
      SET status = ?, updated_at = NOW()
      WHERE id = ?
    `, [status, id]);
  }

  // ================================
  // DELETE subscription
  // ================================
  static async delete(id) {
    await pool.query(
      `DELETE FROM user_course_subscription WHERE id = ?`,
      [id]
    );
  }

  // ================================
  // CHECK active subscription
  // ================================
  static async exists(user_id, course_id) {
    const [rows] = await pool.query(`
      SELECT 1
      FROM user_course_subscription
      WHERE user_id = ? 
        AND course_id = ? 
        AND status = 'active'
      LIMIT 1
    `, [user_id, course_id]);

    return rows.length > 0;
  }
}
