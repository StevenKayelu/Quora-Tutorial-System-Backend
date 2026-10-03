import pool from "../config/db.js";
import TermModel from "./TermModel.js";
import CourseTermModel from "./CourseTermModel.js";
import TopicModel from "./TopicModel.js";

export default class CourseModel {
  static async getAll() {
    const [rows] = await pool.query(
      `SELECT c.*, s.school_name 
       FROM courses c 
       LEFT JOIN school s ON c.school_id = s.id
       ORDER BY c.course_name ASC`
    );
    return rows;
  }

  static async getById(id) {
    const [rows] = await pool.query("SELECT * FROM courses WHERE id=?", [id]);
    return rows[0] || null;
  }

  static async create({ school_id, course_name, course_description, amount }) {
    const [result] = await pool.query(
      "INSERT INTO courses (school_id, course_name, course_description, amount, created_at) VALUES (?, ?, ?, ?, NOW())",
      [school_id, course_name, course_description, amount]
    );

    const courseId = result.insertId;

    // Assign all terms automatically
    const terms = await TermModel.getAll();
    for (const term of terms) {
      await CourseTermModel.assignTermToCourse(courseId, term.id);
    }

    return courseId;
  }

  static async update(id, { school_id, course_name, course_description, amount }) {
    await pool.query(
      "UPDATE courses SET school_id=?, course_name=?, course_description=?, amount=?, updated_at=NOW() WHERE id=?",
      [school_id, course_name, course_description, amount, id]
    );
  }

  static async delete(id) {
  // Delete all topics under this course
  const [topics] = await pool.query("SELECT id FROM topic WHERE course_id = ?", [id]);
  for (const topic of topics) {
    await TopicModel.delete(topic.id); // this should also delete subtopics
  }

  // Remove course-term relations
  await CourseTermModel.deleteByCourse(id);

  // Delete the course
  await pool.query("DELETE FROM courses WHERE id = ?", [id]);
}

}
