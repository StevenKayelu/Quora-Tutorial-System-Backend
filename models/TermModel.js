import pool from "../config/db.js";

export default class TermModel {
  static async getAll() {
    const [rows] = await pool.query(
      `SELECT * 
       FROM term
       ORDER BY term_number ASC`
    );
    return rows;
  }

  static async getById(id) {
    const [rows] = await pool.query("SELECT * FROM term WHERE id=?", [id]);
    return rows[0] || null;
  }

  static async create({ term_number, start_date, end_date }) {
    const [result] = await pool.query(
      `INSERT INTO term (term_number, start_date, end_date, created_at)
       VALUES (?, ?, ?, NOW())`,
      [term_number, start_date, end_date]
    );
    return result.insertId;
  }

  static async update(id, { term_number, start_date, end_date }) {
    await pool.query(
      `UPDATE term 
       SET term_number=?, start_date=?, end_date=?, updated_at=NOW()
       WHERE id=?`,
      [term_number, start_date, end_date, id]
    );
  }

  static async delete(id) {
    await pool.query("DELETE FROM term WHERE id=?", [id]);
  }
}
