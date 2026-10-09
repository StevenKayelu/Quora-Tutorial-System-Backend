import pool from "../config/db.js";

// There is at most one current rules file: the latest row
export const getCurrentRules = async () => {
  const [rows] = await pool.query(
    "SELECT id, file_url, file_name, created_at FROM student_rules ORDER BY id DESC LIMIT 1"
  );
  return rows[0] || null;
};

export const getAllRulesFiles = async () => {
  const [rows] = await pool.query("SELECT id, file_url FROM student_rules");
  return rows;
};

export const addRules = async ({ fileUrl, fileName, uploadedBy }) => {
  const [result] = await pool.query(
    "INSERT INTO student_rules (file_url, file_name, uploaded_by) VALUES (?, ?, ?)",
    [fileUrl, fileName, uploadedBy || null]
  );
  return result.insertId;
};

// Remove every row except keepId (all rows when keepId is null)
export const deleteRulesExcept = async (keepId = null) => {
  if (keepId) {
    await pool.query("DELETE FROM student_rules WHERE id <> ?", [keepId]);
  } else {
    await pool.query("DELETE FROM student_rules");
  }
};
