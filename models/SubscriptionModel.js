import pool from "../config/db.js";
import PaymentModel from "./PaymentModel.js";

export default class SubscriptionModel {
  static async getAll() {
    const [rows] = await pool.query(`
      SELECT s.*, u.first_name, u.last_name, c.course_name
      FROM subscription s
      JOIN user u ON s.user_id = u.u_user_id
      JOIN course c ON s.course_id = c.id
      ORDER BY s.created_at DESC
    `);
    return rows;
  }

  static async getByUser(userId) {
    const [rows] = await pool.query(`
      SELECT s.*, c.course_name 
      FROM subscription s
      JOIN course c ON s.course_id = c.id
      WHERE s.user_id = ?
    `, [userId]);
    return rows;
  }

  static async create({ user_id, course_id, amount, payment_status }) {
    const [result] = await pool.query(`
      INSERT INTO subscription (user_id, course_id, amount, payment_status, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `, [user_id, course_id, amount, payment_status]);

    // Automatically update user status
    await PaymentModel.updateUserStatus(user_id);

    return result.insertId;
  }

  static async updatePaymentStatus(id, status) {
    await pool.query(`
      UPDATE subscription SET payment_status=?, updated_at=NOW() WHERE id=?
    `, [status, id]);

    // Update user overall subscription status
    const [sub] = await pool.query("SELECT user_id FROM subscription WHERE id=? LIMIT 1", [id]);
    if (sub.length) await PaymentModel.updateUserStatus(sub[0].user_id);
  }
}
