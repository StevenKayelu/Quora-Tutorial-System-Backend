import pool from "../config/db.js";
import PaymentModel from "../models/PaymentModel.js";

export default class UserSubscriptionService {

  /**
   * Activate subscriptions for a successful transaction
   * @param {Object} params
   * @param {string} params.transactionId
   */
  static async activateSubscriptions({ transactionId }) {
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // 1️⃣ Get transaction with courses
      const tx = await PaymentModel.getByTransaction(transactionId);
      if (!tx || tx.payment_status !== "success") {
        throw new Error("Invalid or unpaid transaction");
      }

      const userId = tx.user_id;

      // Ensure we have courses
      const courseIds = tx.courses?.map(c => c.id);
      if (!courseIds || courseIds.length === 0) {
        throw new Error("No courses found for this transaction");
      }

      // 2️⃣ Activate subscriptions
      for (const courseId of courseIds) {
        await conn.query(
          `
          INSERT INTO user_course_subscription 
            (user_id, course_id, subscribed_at, status)
          VALUES (?, ?, NOW(), 'active')
          ON DUPLICATE KEY UPDATE 
            status = 'active',
            subscribed_at = NOW(),
          `,
          [userId, courseId]
        );
      }

      // 3️⃣ Update user overall status
      const [subs] = await conn.query(`
        SELECT COUNT(*) AS activeCount 
        FROM user_course_subscription 
        WHERE user_id=? AND status='active'
      `, [userId]);

      const newStatus = subs[0].activeCount > 0 ? "subscribed" : "inactive";

      await conn.query(
        `UPDATE user SET u_status=? WHERE u_user_id=?`,
        [newStatus, userId]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}
