import pool from "../config/db.js";

export default class UserSubscriptionModel {

  /**
   * Get course IDs the user currently has an active, unexpired subscription to
   */
  static async getSubscribedCourseIds(userId) {
    const [rows] = await pool.query(`
      SELECT DISTINCT course_id
      FROM user_course_subscription
      WHERE user_id = ?
        AND status = 'active'
        AND expires_at >= CURDATE()
    `, [userId]);

    return rows.map(r => r.course_id);
  }

  /**
   * Check if user is subscribed to a course
   */
  static async isSubscribed(userId, courseId) {
    const [rows] = await pool.query(`
      SELECT 1
      FROM user_course_subscription
      WHERE user_id = ?
        AND course_id = ?
        AND status = 'active'
        AND expires_at >= CURDATE()
      LIMIT 1
    `, [userId, courseId]);

    return rows.length > 0;
  }
}
