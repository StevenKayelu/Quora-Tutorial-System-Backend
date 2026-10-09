import pool from "../config/db.js";
import SubtopicModel from "./SubtopicModel.js";
import { deleteR2FilesQuietly } from "../utils/r2Upload.js";

export default class TopicModel {
  static async getAll() {
    const [rows] = await pool.query(
      `SELECT t.*, te.term_number
       FROM topic t
       LEFT JOIN term te ON t.term_id = te.id
       ORDER BY te.term_number ASC, t.topic_title ASC`
    );
    return rows;
  }

  static async getById(id) {
    const [rows] = await pool.query("SELECT * FROM topic WHERE id=?", [id]);
    return rows[0] || null;
  }

  static async getByCourseAndTerm(courseId, termId) {
    const [rows] = await pool.query(
      `
      SELECT *
      FROM topic
      WHERE course_id = ?
        AND term_id = ?
      ORDER BY topic_title ASC
      `,
      [courseId, termId]
    );
    return rows;
  }

  static async create({ course_id, term_id, topic_title, topic_description }) {
    const [result] = await pool.query(
      `
      INSERT INTO topic (course_id, term_id, topic_title, topic_description, created_at)
      VALUES (?, ?, ?, ?, NOW())
      `,
      [course_id, term_id, topic_title, topic_description]
    );
    return result.insertId;
  }


  static async update(id, {course_id, term_id, topic_title, topic_description }) {
    await pool.query(
      `UPDATE topic 
       SET course_id=?, term_id=?, topic_title=?, topic_description=?, updated_at=NOW()
       WHERE id=?`,
      [course_id, term_id, topic_title, topic_description, id]
    );
  }

  static async delete(id) {
  // Delete all subtopics under this topic
  const [subtopics] = await pool.query("SELECT id FROM subtopic WHERE topic_id = ?", [id]);
  for (const subtopic of subtopics) {
    await SubtopicModel.delete(subtopic.id);
  }

  // Materials attached directly to the topic (no subtopic)
  const [files] = await pool.query(
    "SELECT file_url FROM topic_material WHERE topic_id = ? AND subtopic_id IS NULL AND file_url IS NOT NULL",
    [id]
  );
  await pool.query("DELETE FROM topic_material WHERE topic_id = ? AND subtopic_id IS NULL", [id]);
  await deleteR2FilesQuietly(files.map((f) => f.file_url));

  // Delete the topic itself
  await pool.query("DELETE FROM topic WHERE id = ?", [id]);
}

}
