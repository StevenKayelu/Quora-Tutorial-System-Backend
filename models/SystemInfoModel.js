import pool from "../config/db.js";

// Get latest system info
export const getSystemInfo = async () => {
  const [rows] = await pool.query(
    "SELECT * FROM system_info ORDER BY id DESC LIMIT 1"
  );
  return rows[0] || null;
};

// Create new system info
export const createSystemInfo = async (info) => {
  const {
    system_name,
    logo,
    favicon,
    coursera_images,
    about_us,
    terms_and_conditions,
    privacy_policy,
  } = info;

  const [result] = await pool.query(
    `INSERT INTO system_info (
      system_name,
      logo,
      favicon,
      coursera_images,
      about_us,
      terms_and_conditions,
      privacy_policy,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      system_name,
      logo,
      favicon,
      JSON.stringify(coursera_images || []),
      about_us,
      terms_and_conditions,
      privacy_policy,
    ]
  );

  return result.insertId;
};

// Update system info
export const updateSystemInfo = async (id, data) => {
  const fields = [];
  const values = [];

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      if (key === "coursera_images") {
        // ✅ Guard against double stringify
        values.push(typeof value === "string" ? value : JSON.stringify(value));
      } else {
        values.push(value);
      }
    }
  });

  if (!fields.length) return false;

  const query = `
    UPDATE system_info
    SET ${fields.join(", ")}, updated_at = NOW()
    WHERE id = ?
  `;

  values.push(id);
  const [result] = await pool.query(query, values);
  return result.affectedRows > 0;
};

// Delete system info
export const deleteSystemInfo = async (id) => {
  const [result] = await pool.query(
    "DELETE FROM system_info WHERE id = ?",
    [id]
  );
  return result.affectedRows > 0;
};

// Get system info by id
export const getSystemInfoById = async (id) => {
  const [rows] = await pool.query(
    "SELECT * FROM system_info WHERE id = ?",
    [id]
  );
  return rows[0] || null;
};
