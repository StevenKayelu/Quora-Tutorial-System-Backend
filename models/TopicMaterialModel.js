import pool from "../config/db.js";

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
       (subtopic_id, material_type, title, file_url, video_url, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        subtopic_id,
        material_type,
        title,
        file_url || null,
        video_url || null,
        description || "",
      ]
    );

    return result.insertId;
  }

  static async update(
    id,
    { subtopic_id, material_type, title, file_url, video_url, description }
  ) {
    await pool.query(
      `UPDATE topic_material
       SET subtopic_id = ?,
           material_type = ?,
           title = ?,
           file_url = ?,
           video_url = ?,
           description = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [
        subtopic_id,
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
  await pool.query(
    "DELETE FROM topic_material WHERE subtopic_id = ?",
    [subtopicId]
  );
}

}
