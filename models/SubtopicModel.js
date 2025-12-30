import pool from "../config/db.js";
import TopicMaterialModel from "./TopicMaterialModel.js";

export default class SubtopicModel {
  static async getAll() {
    const [rows] = await pool.query(
      `SELECT st.*, t.topic_title 
       FROM subtopic st
       LEFT JOIN topic t ON st.topic_id = t.id
       ORDER BY st.subtopic_title ASC`
    );
    return rows;
  }

  static async getById(id) {
    const [rows] = await pool.query("SELECT * FROM subtopic WHERE id=?", [id]);
    return rows[0] || null;
  }

  static async create({ topic_id, subtopic_title, subtopic_description, is_free }) {
    const [result] = await pool.query(
      `INSERT INTO subtopic (topic_id, subtopic_title, subtopic_description, is_free, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [topic_id, subtopic_title, subtopic_description, is_free || 0]
    );
    return result.insertId;
  }

  static async update(id, { topic_id, subtopic_title, subtopic_description, is_free }) {
    await pool.query(
      `UPDATE subtopic 
       SET topic_id=?, subtopic_title=?, subtopic_description=?, is_free=?, updated_at=NOW() 
       WHERE id=?`,
      [topic_id, subtopic_title, subtopic_description, is_free || 0, id]
    );
  }

  static async delete(id) {
    // Delete all materials under this subtopic first
    await TopicMaterialModel.deleteBySubtopic(id);

    // Then delete the subtopic itself
    await pool.query("DELETE FROM subtopic WHERE id = ?", [id]);
  }

  static async getByTopicIds(topicIds) {
  if (!Array.isArray(topicIds) || topicIds.length === 0) return [];

  const placeholders = topicIds.map(() => "?").join(",");
  const [rows] = await pool.query(
    `SELECT * FROM subtopic WHERE topic_id IN (${placeholders}) ORDER BY subtopic_title ASC`,
    topicIds
  );
  return rows;
}

}
