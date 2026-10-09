import pool from "../config/db.js";
import { deleteR2FilesQuietly } from "../utils/r2Upload.js";

export default class TopicMaterialModel {
  static async getAll() {
    const [rows] = await pool.query(
      `SELECT tm.*, st.subtopic_title
       FROM topic_material tm
       LEFT JOIN subtopic st ON tm.subtopic_id = st.id
       ORDER BY tm.id ASC`
    );
    return rows;
  }

  // Materials whose subtopic or topic is marked free, with their full
  // school → course → term → topic → subtopic context for browsing.
  static async getFreeWithContext() {
    const [rows] = await pool.query(
      `SELECT tm.id, tm.material_type, tm.title, tm.description, tm.video_url,
              tm.file_url, tm.created_at,
              st.id AS subtopic_id, st.subtopic_title,
              t.id AS topic_id, t.topic_title,
              tr.id AS term_id, tr.term_number,
              c.id AS course_id, c.course_name,
              s.id AS school_id, s.school_name
       FROM topic_material tm
       JOIN subtopic st ON st.id = tm.subtopic_id
       JOIN topic t ON t.id = st.topic_id
       JOIN courses c ON c.id = t.course_id
       JOIN (SELECT id AS course_id, school_id FROM courses
             UNION
             SELECT course_id, school_id FROM course_school) offered
         ON offered.course_id = c.id
       JOIN school s ON s.id = offered.school_id
       LEFT JOIN term tr ON tr.id = COALESCE(t.term_id, tm.term_id)
       WHERE COALESCE(st.is_free, 0) = 1 OR COALESCE(t.is_free, 0) = 1
       ORDER BY s.school_name, c.course_name, tr.term_number, t.id, st.id, tm.id`
    );
    return rows;
  }

  static async getById(id) {
    const [rows] = await pool.query(
      "SELECT * FROM topic_material WHERE id = ?",
      [id]
    );
    return rows[0] || null;
  }

  static async create({
    subtopic_id,
    material_type,
    title,
    file_url,
    video_url,
    description,
  }) {
    const [result] = await pool.query(
      `INSERT INTO topic_material
       (topic_id, term_id, subtopic_id, material_type, title, file_url, video_url, description, created_at)
       SELECT st.topic_id, t.term_id, st.id, ?, ?, ?, ?, ?, NOW()
       FROM subtopic st
       JOIN topic t ON t.id = st.topic_id
       WHERE st.id = ?`,
      [
        material_type,
        title,
        file_url || null,
        video_url || null,
        description || "",
        subtopic_id,
      ]
    );

    if (!result.affectedRows) throw new Error(`Subtopic ${subtopic_id} not found`);
    return result.insertId;
  }

  static async update(
    id,
    { subtopic_id, material_type, title, file_url, video_url, description }
  ) {
    await pool.query(
      `UPDATE topic_material tm
       JOIN subtopic st ON st.id = COALESCE(?, tm.subtopic_id)
       JOIN topic t ON t.id = st.topic_id
       SET tm.subtopic_id = st.id,
           tm.topic_id = st.topic_id,
           tm.term_id = t.term_id,
           tm.material_type = ?,
           tm.title = ?,
           tm.file_url = ?,
           tm.video_url = ?,
           tm.description = ?,
           tm.updated_at = NOW()
       WHERE tm.id = ?`,
      [
        subtopic_id || null,
        material_type,
        title,
        file_url || null,
        video_url || null,
        description || "",
        id,
      ]
    );
  }

  static async delete(id) {
    await pool.query("DELETE FROM topic_material WHERE id = ?", [id]);
  }

static async getBySubtopicIds(subtopicIds, type = null) {
  if (!Array.isArray(subtopicIds) || !subtopicIds.length) return [];

  const placeholders = subtopicIds.map(() => "?").join(",");

  let sql = `
    SELECT *
    FROM topic_material
    WHERE subtopic_id IN (${placeholders})
  `;

  const params = [...subtopicIds];

  // only filter by type when provided
  if (type) {
    sql += " AND material_type = ?";
    params.push(type);
  }

  sql += " ORDER BY id ASC";

  const [rows] = await pool.query(sql, params);
  return rows;
}


  static async getBySubtopicAndType(subtopicId, type) {
    const [rows] = await pool.query(
      `SELECT tm.*, st.subtopic_title
       FROM topic_material tm
       LEFT JOIN subtopic st ON tm.subtopic_id = st.id
       WHERE tm.subtopic_id = ?
       AND tm.material_type = ?
       ORDER BY tm.id ASC`,
      [subtopicId, type]
    );
    return rows;
  }
  static async deleteBySubtopic(subtopicId) {
  const [files] = await pool.query(
    "SELECT file_url FROM topic_material WHERE subtopic_id = ? AND file_url IS NOT NULL",
    [subtopicId]
  );
  await pool.query(
    "DELETE FROM topic_material WHERE subtopic_id = ?",
    [subtopicId]
  );
  await deleteR2FilesQuietly(files.map((f) => f.file_url));
}

}
