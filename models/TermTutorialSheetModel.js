import pool from "../config/db.js";

export default class TermTutorialSheetModel {
  static async getAll() {
    const [rows] = await pool.query("SELECT * FROM term_tutorial_sheet ORDER BY id ASC");
    return rows;
  }

  static async getById(id) {
    const [rows] = await pool.query("SELECT * FROM term_tutorial_sheet WHERE id = ?", [id]);
    return rows[0] || null;
  }

  static async getByCourseAndTerm(courseId, termId) {
    const [rows] = await pool.query(
      `
      SELECT *
      FROM term_tutorial_sheet
      WHERE course_id = ?
        AND term_id = ?
      ORDER BY title ASC
      `,
      [courseId, termId]
    );
    return rows;
  }

  static async create({ course_id, term_id, title, file_url }) {
    const [result] = await pool.query(
      `
      INSERT INTO term_tutorial_sheet
      (course_id, term_id, title, file_url, created_at)
      VALUES (?, ?, ?, ?, NOW())
      `,
      [course_id, term_id, title, file_url]
    );
    return result.insertId;
  }

  static async update(id, { course_id, term_id, title, file_url }) {
    await pool.query(
      `
      UPDATE term_tutorial_sheet
      SET course_id=?, term_id=?, title=?, file_url=?, updated_at=NOW()
      WHERE id=?
      `,
      [course_id, term_id, title, file_url, id]
    );
  }

  static async delete(id) {
    await pool.query("DELETE FROM term_tutorial_sheet WHERE id=?", [id]);
  }
}
