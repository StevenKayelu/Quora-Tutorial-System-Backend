import pool from "../config/db.js";

export default class TermTestModel {
  static async getAll() {
    const [rows] = await pool.query("SELECT * FROM term_test ORDER BY id ASC");
    return rows;
  }

  static async getById(id) {
    const [rows] = await pool.query("SELECT * FROM term_test WHERE id = ?", [id]);
    return rows[0] || null;
  }

  static async getByCourseAndTerm(courseId, termId) {
    const [rows] = await pool.query(
      `
      SELECT *
      FROM term_test
      WHERE course_id = ?
        AND term_id = ?
      ORDER BY test_type ASC
      `,
      [courseId, termId]
    );
    return rows;
  }

  static async create({ course_id, term_id, title, file_url, test_type }) {
    const [result] = await pool.query(
      `
      INSERT INTO term_test
      (course_id, term_id, title, file_url, test_type, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
      `,
      [course_id, term_id, title, file_url, test_type]
    );
    return result.insertId;
  }

  static async update(id, { course_id, term_id, title, file_url, test_type }) {
    await pool.query(
      `
      UPDATE term_test
      SET course_id=?, term_id=?, title=?, file_url=?, test_type=?, updated_at=NOW()
      WHERE id=?
      `,
      [course_id, term_id, title, file_url, test_type, id]
    );
  }


  static async delete(id) {
    await pool.query("DELETE FROM term_test WHERE id=?", [id]);
  }
}
