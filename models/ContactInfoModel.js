import pool from "../config/db.js";

/**
 * Fetch latest contact info
 */
export const getContactInfo = async () => {
  const [rows] = await pool.query(
    "SELECT * FROM contact_info ORDER BY id DESC LIMIT 1"
  );
  return rows[0] || null;
};

/**
 * Create contact info
 */
export const createContactInfo = async (data) => {
  const {
    contact_email,
    contact_phone,
    whatsapp_number,
    contact_video_url,
    contact_video_caption,
    social_links,
  } = data;

  const [result] = await pool.query(
    `INSERT INTO contact_info (
      contact_email,
      contact_phone,
      whatsapp_number,
      contact_video_url,
      contact_video_caption,
      social_links,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      contact_email,
      contact_phone,
      whatsapp_number,
      contact_video_url || null,
      contact_video_caption || null,
      JSON.stringify(social_links || []),
    ]
  );

  return result.insertId;
};

/**
 * Update contact info
 */
export const updateContactInfo = async (id, data) => {
  const fields = [];
  const values = [];

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      if (key === "social_links") {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }
  });

  if (!fields.length) return false;

  const query = `
    UPDATE contact_info
    SET ${fields.join(", ")}, updated_at = NOW()
    WHERE id = ?
  `;

  values.push(id);
  const [result] = await pool.query(query, values);

  return result.affectedRows > 0;
};

/**
 * Delete contact info
 */
export const deleteContactInfo = async (id) => {
  const [result] = await pool.query(
    "DELETE FROM contact_info WHERE id = ?",
    [id]
  );
  return result.affectedRows > 0;
};
