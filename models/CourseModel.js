import pool from "../config/db.js";
import TermModel from "./TermModel.js";
import CourseTermModel from "./CourseTermModel.js";
import TopicModel from "./TopicModel.js";
import { deleteR2FilesQuietly } from "../utils/r2Upload.js";

// "3,7" (GROUP_CONCAT) → [3, 7]
const withSharedSchools = (row) => ({
  ...row,
  shared_school_ids: row.shared_school_ids
    ? String(row.shared_school_ids).split(",").map(Number)
    : [],
});

export default class CourseModel {
  static async getAll() {
    const [rows] = await pool.query(
      `SELECT c.*, s.school_name,
              (SELECT GROUP_CONCAT(cs.school_id ORDER BY cs.school_id)
               FROM course_school cs WHERE cs.course_id = c.id) AS shared_school_ids
       FROM courses c 
       LEFT JOIN school s ON c.school_id = s.id
       ORDER BY c.course_name ASC`
    );
    return rows.map(withSharedSchools);
  }

  // Offer existing courses at one more school (skips each course's main
  // school and existing links). Returns how many courses were newly assigned.
  static async assignCoursesToSchool(schoolId, courseIds) {
    const ids = [...new Set((courseIds || []).map(Number))].filter(Boolean);
    if (!ids.length) return 0;
    const [result] = await pool.query(
      `INSERT IGNORE INTO course_school (course_id, school_id)
       SELECT c.id, ? FROM courses c
       WHERE c.id IN (?) AND c.school_id <> ?`,
      [schoolId, ids, schoolId]
    );
    return result.affectedRows;
  }

  // Stop offering a course at one shared school (its main school is untouched)
  static async unassignCourseFromSchool(courseId, schoolId) {
    const [result] = await pool.query(
      "DELETE FROM course_school WHERE course_id = ? AND school_id = ?",
      [courseId, schoolId]
    );
    return result.affectedRows > 0;
  }

  // Replace the extra schools a course is shared with (never its main school)
  static async setSharedSchools(courseId, schoolIds, mainSchoolId) {
    const ids = [...new Set((schoolIds || []).map(Number))].filter(
      (id) => id && id !== Number(mainSchoolId)
    );
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query("DELETE FROM course_school WHERE course_id = ?", [courseId]);
      if (ids.length) {
        await conn.query(
          `INSERT INTO course_school (course_id, school_id)
           SELECT ?, id FROM school WHERE id IN (?)`,
          [courseId, ids]
        );
      }
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  static async getById(id) {
    const [rows] = await pool.query(
      `SELECT c.*,
              (SELECT GROUP_CONCAT(cs.school_id ORDER BY cs.school_id)
               FROM course_school cs WHERE cs.course_id = c.id) AS shared_school_ids
       FROM courses c WHERE c.id=?`,
      [id]
    );
    return rows[0] ? withSharedSchools(rows[0]) : null;
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

  /**
   * Subscriptions and payments are financial records, so a course that has
   * any can't be deleted. Throws an error with code "COURSE_IN_USE".
   */
  static async assertDeletable(ids) {
    const courseIds = Array.isArray(ids) ? ids : [ids];
    if (!courseIds.length) return;

    const [[{ subs }]] = await pool.query(
      "SELECT COUNT(*) AS subs FROM user_course_subscription WHERE course_id IN (?)",
      [courseIds]
    );
    const [[{ payments }]] = await pool.query(
      "SELECT COUNT(*) AS payments FROM payment_transaction_courses WHERE course_id IN (?)",
      [courseIds]
    );

    if (subs > 0 || payments > 0) {
      const err = new Error(
        "This course has subscriptions or payments and can't be deleted. Remove those first."
      );
      err.code = "COURSE_IN_USE";
      throw err;
    }
  }

  static async delete(id) {
  // Check before deleting anything, so a refusal never leaves a half-deleted course
  await CourseModel.assertDeletable(id);

  // Term-level files for this course
  const [files] = await pool.query(
    `SELECT file_url FROM term_test WHERE course_id = ?
     UNION ALL
     SELECT file_url FROM term_tutorial_sheet WHERE course_id = ?`,
    [id, id]
  );
  await pool.query("DELETE FROM term_test WHERE course_id = ?", [id]);
  await pool.query("DELETE FROM term_tutorial_sheet WHERE course_id = ?", [id]);
  await deleteR2FilesQuietly(files.map((f) => f.file_url));

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
