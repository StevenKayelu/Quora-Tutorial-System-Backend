// models/PaymentTransactionModel.js
import pool from "../config/db.js";

export default class PaymentTransactionModel {

  static async getAll() {
    const [rows] = await pool.query(`
      SELECT pt.*, u.first_name AS user_name
      FROM payment_transaction pt
      LEFT JOIN user u ON u.id = pt.user_id
      ORDER BY pt.created_at DESC
    `);
    return rows;
  }

  static async getById(id) {
    const [rows] = await pool.query(`
      SELECT * FROM payment_transaction WHERE id = ?
    `, [id]);
    return rows[0];
  }

static async getCoursesByTransaction(transactionIdString) {
  const [rows] = await pool.query(`
    SELECT c.id, c.course_id
    FROM payment_transaction_courses ptc
    JOIN courses c ON c.id = ptc.course_id
    WHERE ptc.transaction_id = ?
  `, [transactionIdString]);

  return rows;
}
// Add a static method to delete a transaction by ID
// models/PaymentTransactionModel.js
  static async deleteById(id) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1️⃣ Get transaction info (user + transaction_id string)
      const [[transaction]] = await connection.query(
        `SELECT id, user_id, transaction_id FROM payment_transaction WHERE id = ?`,
        [id]
      );

      if (!transaction) {
        await connection.rollback();
        return 0;
      }

      // 2️⃣ Get all course IDs linked to this transaction
      const [courses] = await connection.query(
        `SELECT course_id FROM payment_transaction_courses WHERE transaction_id = ?`,
        [transaction.transaction_id]
      );

      const courseIds = courses.map(c => c.course_id);

      // 3️⃣ Delete user course subscriptions created via payment
      if (courseIds.length > 0) {
        await connection.query(
          `
          DELETE FROM user_course_subscription
          WHERE user_id = ?
            AND course_id IN (?)
            AND source = 'payment'
          `,
          [transaction.user_id, courseIds]
        );
      }

      // 4️⃣ Delete transaction-course mappings
      await connection.query(
        `DELETE FROM payment_transaction_courses WHERE transaction_id = ?`,
        [transaction.transaction_id]
      );

      // 5️⃣ Delete the transaction itself
      const [result] = await connection.query(
        `DELETE FROM payment_transaction WHERE id = ?`,
        [id]
      );

      await connection.commit();
      return result.affectedRows;

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}
