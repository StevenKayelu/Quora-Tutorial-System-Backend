import pool from "../config/db.js";

export default class CourseTermModel {
  static async assignTermToCourse(courseId, termId) {
    const [existing] = await pool.query(
      "SELECT * FROM course_term WHERE course_id=? AND term_id=?",
      [courseId, termId]
    );
    if (existing.length === 0) {
      await pool.query("INSERT INTO course_term (course_id, term_id) VALUES (?, ?)", [courseId, termId]);
    }
  }

  static async getTermsByCourse(courseId) {
    const [rows] = await pool.query(
      "SELECT * FROM course_term WHERE course_id=?",
      [courseId]
    );
    return rows; // returns [{id, course_id, term_id}, ...]
  }

  static async deleteByCourse(courseId) {
    await pool.query("DELETE FROM course_term WHERE course_id=?", [courseId]);
  }
}
