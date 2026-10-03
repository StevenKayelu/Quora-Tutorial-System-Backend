import pool from "../config/db.js";

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
  // Get all courses under the school
  const [courses] = await pool.query("SELECT id FROM courses WHERE school_id = ?", [id]);

  // Delete each course (this will also delete topics & subtopics)
  for (const course of courses) {
    await CourseModel.delete(course.id);
  }

  // Delete the school itself
  await pool.query("DELETE FROM school WHERE id = ?", [id]);
}

}
