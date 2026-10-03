import pool from "../config/db.js";

export default class MaterialModel {
  // Get all materials with optional filtering by active status
  static async getAll(isStudent = false) {
    const [rows] = await pool.query(
      `SELECT m.*, st.subtopic_title 
       FROM material m 
       LEFT JOIN subtopic st ON m.subtopic_id = st.id 
       ${isStudent ? "WHERE m.is_active = 1" : ""}
       ORDER BY m.created_at DESC`
    );
    return rows;
  }

  static async getById(id) {
    const [rows] = await pool.query("SELECT * FROM material WHERE id = ?", [id]);
    return rows[0] || null;
  }

  static async create({ subtopic_id, document_url, document_description, video_url, video_description, is_active = 1 }) {
    const [result] = await pool.query(
      `INSERT INTO material 
       (subtopic_id, document_url, document_description, video_url, video_description, is_active, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [subtopic_id, document_url, document_description, video_url, video_description, is_active]
    );
    return result.insertId;
  }

  static async update(id, { subtopic_id, document_url, document_description, video_url, video_description, is_active }) {
    await pool.query(
      `UPDATE material 
       SET subtopic_id=?, document_url=?, document_description=?, video_url=?, video_description=?, is_active=?, updated_at=NOW() 
       WHERE id=?`,
      [subtopic_id, document_url, document_description, video_url, video_description, is_active, id]
    );
  }

  static async delete(id) {
    await pool.query("DELETE FROM material WHERE id=?", [id]);
  }
}
