import pool from "../config/db.js";

// School + year of study: registration options, each user's own values,
// and the admin-managed study_year list.

export const getSchoolOptions = async () => {
  const [rows] = await pool.query(
    "SELECT id, school_name FROM school ORDER BY school_name ASC"
  );
  return rows;
};

export const getStudyYears = async () => {
  const [rows] = await pool.query(
    `SELECT sy.id, sy.name, sy.sort_order,
            (SELECT COUNT(*) FROM user u WHERE u.study_year_id = sy.id) AS user_count
     FROM study_year sy
     ORDER BY sy.sort_order ASC, sy.id ASC`
  );
  return rows;
};

export const schoolExists = async (id) => {
  const [rows] = await pool.query("SELECT 1 FROM school WHERE id = ? LIMIT 1", [id]);
  return rows.length > 0;
};

export const studyYearExists = async (id) => {
  const [rows] = await pool.query("SELECT 1 FROM study_year WHERE id = ? LIMIT 1", [id]);
  return rows.length > 0;
};

// userId is the INT primary key (user.id)
export const getUserAcademic = async (userId) => {
  const [rows] = await pool.query(
    `SELECT u.school_id, s.school_name, u.study_year_id, sy.name AS study_year_name
     FROM user u
     LEFT JOIN school s ON s.id = u.school_id
     LEFT JOIN study_year sy ON sy.id = u.study_year_id
     WHERE u.id = ?
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

export const getUserAcademicByUserId = async (uUserId) => {
  const [rows] = await pool.query(
    `SELECT u.school_id, s.school_name, u.study_year_id, sy.name AS study_year_name
     FROM user u
     LEFT JOIN school s ON s.id = u.school_id
     LEFT JOIN study_year sy ON sy.id = u.study_year_id
     WHERE u.u_user_id = ?
     LIMIT 1`,
    [uUserId]
  );
  return rows[0] || null;
};

// Registration identifies the new user by u_user_id
export const setUserAcademicByUserId = async (uUserId, schoolId, studyYearId) => {
  const [result] = await pool.query(
    "UPDATE user SET school_id = ?, study_year_id = ? WHERE u_user_id = ?",
    [schoolId, studyYearId, uUserId]
  );
  return result.affectedRows > 0;
};

export const setUserAcademic = async (userId, schoolId, studyYearId) => {
  const [result] = await pool.query(
    "UPDATE user SET school_id = ?, study_year_id = ?, u_updated_at = NOW() WHERE id = ?",
    [schoolId, studyYearId, userId]
  );
  return result.affectedRows > 0;
};

export const createStudyYear = async (name, sortOrder) => {
  const [result] = await pool.query(
    "INSERT INTO study_year (name, sort_order) VALUES (?, ?)",
    [name, sortOrder]
  );
  return result.insertId;
};

export const getNextStudyYearOrder = async () => {
  const [rows] = await pool.query(
    "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM study_year"
  );
  return rows[0].next;
};

export const updateStudyYear = async (id, name, sortOrder) => {
  const [result] = await pool.query(
    "UPDATE study_year SET name = ?, sort_order = ? WHERE id = ?",
    [name, sortOrder, id]
  );
  return result.affectedRows > 0;
};

// Reorder: ids in their new display order
export const reorderStudyYears = async (ids) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (let i = 0; i < ids.length; i++) {
      await conn.query("UPDATE study_year SET sort_order = ? WHERE id = ?", [i + 1, ids[i]]);
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const countUsersInStudyYear = async (id) => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS n FROM user WHERE study_year_id = ?",
    [id]
  );
  return Number(rows[0].n);
};

export const deleteStudyYear = async (id) => {
  const [result] = await pool.query("DELETE FROM study_year WHERE id = ?", [id]);
  return result.affectedRows > 0;
};
