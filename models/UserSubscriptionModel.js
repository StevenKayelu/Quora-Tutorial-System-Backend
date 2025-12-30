import pool from "../config/db.js";

export default class UserSubscriptionModel {

  /**
   * Get course IDs that the user has successfully paid for
   */
  static async getSubscribedCourseIds(userId) {
  const [rows] = await pool.query(`
    SELECT DISTINCT ptc.course_id
    FROM payment_transaction pt
    JOIN payment_transaction_courses ptc 
      ON pt.transaction_id = ptc.transaction_id
    WHERE pt.user_id = ? 
      AND pt.payment_status = 'success'
  `, [userId]);

  return rows.map(r => r.course_id);
}
  /**
   * Check if user is subscribed to a course
   */
  static async isSubscribed(userId, courseId) {
    const [rows] = await pool.query(`
      SELECT 1
      FROM payment_transaction
      WHERE user_id=? AND subscription_id=? AND payment_status='success'
      LIMIT 1
    `, [userId, courseId]);

    return rows.length > 0;
  }
}
