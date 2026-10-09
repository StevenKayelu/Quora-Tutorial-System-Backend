import pool from "../config/db.js";
import CourseModel from "./CourseModel.js";

export default class SchoolModel {
  static async getAll() {
    const [rows] = await pool.query("SELECT * FROM school ORDER BY school_name ASC");
    return rows;
  }

  static async getById(id) {
    const [rows] = await pool.query("SELECT * FROM school WHERE id = ?", [id]);
    return rows[0] || null;
  }

static async create({ school_name, school_description }) {
  const [result] = await pool.query(
    "INSERT INTO school (school_name, school_description, created_at) VALUES (?, ?, NOW())",
    [school_name, school_description]
  );
  return result.insertId;
}

  static async update(id, { school_name, school_description }) {
    await pool.query(
      "UPDATE school SET school_name=?, school_description=?, updated_at=NOW() WHERE id=?",
      [school_name, school_description, id]
    );
  }

 static async delete(id) {
  // Courses whose main school this is. Shared ones move to another of their
  // schools (lowest id) instead of being deleted.
  const [mainCourses] = await pool.query(
    `SELECT c.id,
            (SELECT MIN(cs.school_id) FROM course_school cs
             WHERE cs.course_id = c.id AND cs.school_id <> ?) AS next_school_id
     FROM courses c WHERE c.school_id = ?`,
    [id, id]
  );
  const courses = mainCourses.filter((c) => !c.next_school_id);
  const movedCourses = mainCourses.filter((c) => c.next_school_id);

  // Refuse up front if any course is in use, rather than failing halfway through
  await CourseModel.assertDeletable(courses.map((c) => c.id));

  // Delete each course (this will also delete topics & subtopics)
  for (const course of courses) {
    await CourseModel.delete(course.id);
  }

  for (const course of movedCourses) {
    await pool.query("UPDATE courses SET school_id = ?, updated_at = NOW() WHERE id = ?", [
      course.next_school_id,
      course.id,
    ]);
    await pool.query("DELETE FROM course_school WHERE course_id = ? AND school_id = ?", [
      course.id,
      course.next_school_id,
    ]);
  }

  // Delete the school itself (its shared-course links go with it)
  await pool.query("DELETE FROM school WHERE id = ?", [id]);
}

}
