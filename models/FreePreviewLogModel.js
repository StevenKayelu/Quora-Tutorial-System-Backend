import db from "../config/db.js"; // your DB connection

export default class FreePreviewLogModel {
  static async logView({ user_id, topic_id }) {
    const sql = `INSERT INTO free_preview_log (user_id, topic_id) VALUES (?, ?)`;
    const [result] = await db.execute(sql, [user_id, topic_id]);
    return result.insertId;
  }

  static async getByUser(user_id) {
    const sql = `SELECT * FROM free_preview_log WHERE user_id = ? ORDER BY viewed_at DESC`;
    const [rows] = await db.execute(sql, [user_id]);
    return rows;
  }

  static async getByTopic(topic_id) {
    const sql = `SELECT * FROM free_preview_log WHERE topic_id = ? ORDER BY viewed_at DESC`;
    const [rows] = await db.execute(sql, [topic_id]);
    return rows;
  }

  static async deleteLog(id) {
    const sql = `DELETE FROM free_preview_log WHERE id = ?`;
    const [result] = await db.execute(sql, [id]);
    return result.affectedRows;
  }
}
