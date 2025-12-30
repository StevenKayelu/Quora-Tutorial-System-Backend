import pool from "../config/db.js";

/**
 * Inserts a new user into the database.
 */
export const registerUserInDb = async (
  userId,
  firstName,
  lastName,
  gender,
  email,
  hashedPassword,
  mobile,
  role,
  status
) => {
  try {
    const query = `
      INSERT INTO user (
        u_user_id,
        first_name,
        last_name,
        gender,
        u_email,
        u_password,
        u_mobile,
        u_role,
        u_status,
        u_created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const [result] = await pool.query(query, [
      userId,
      firstName,
      lastName,
      gender,
      email,
      hashedPassword,
      mobile,
      role,
      status,
    ]);

    if (result.affectedRows === 1) {
      return {
        u_user_id: userId,
        first_name: firstName,
        last_name: lastName,
        gender,
        u_email: email,
        u_mobile: mobile,
        u_role: role,
        u_status: status,
      };
    }

    return null;
  } catch (error) {
    console.error("registerUserInDb error:", error);
    return null;
  }
};



// 🔹 Fetch user by email
export const getUserByEmail = async (email) => {
  if (!email) return null;

  try {
    const [rows] = await pool.query(
      `SELECT 
          u_user_id,
          first_name,
          last_name,
          gender,
          u_email,
          u_password,
          u_mobile,
          u_image,
          u_role,
          u_status
        FROM user 
        WHERE u_email = ? 
        LIMIT 1`,
      [email]
    );

    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("getUserByEmail error:", error);
    return null;
  }
};

// 🔹 Fetch user by unique ID
export const getUserByUserId = async (refId) => {
  if (!refId) return null;

  try {
    const [rows] = await pool.query(
      `SELECT 
          u_user_id,
          first_name,
          last_name,
          gender,
          u_email,
          u_password,
          u_mobile,
          u_image,
          u_role,
          u_status
        FROM user 
        WHERE u_user_id = ? 
        LIMIT 1`,
      [refId]
    );

    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("getUserByUserId error:", error);
    return null;
  }
};

// 🔹 Get last user ID for current year prefix (e.g., "25")
export const getLastUserId = async (yearPrefix) => {
  try {
    const [rows] = await pool.query(
      `SELECT u_user_id 
       FROM user 
       WHERE u_user_id LIKE ? 
       ORDER BY u_user_id DESC 
       LIMIT 1`,
      [`${yearPrefix}%`]
    );

    return rows.length > 0 ? rows[0].u_user_id : null;
  } catch (error) {
    console.error("getLastUserId error:", error);
    return null;
  }
};

// 🔹 Fetch user by internal DB ID (if you ever need it)
export const getUserById = async (userId) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM user WHERE u_user_id = ?",
      [userId]
    );
    return rows[0] || null;
  } catch (error) {
    console.error("getUserById error:", error);
    return null;
  }
};

// 🔹 Fetch all users
export const getAllUsers = async () => {
  try {
    const [rows] = await pool.query(
      `SELECT 
          u_user_id, 
          first_name, 
          last_name, 
          gender,
          u_email, 
          u_mobile, 
          u_image, 
          u_role, 
          u_status 
       FROM user 
       ORDER BY u_created_at DESC`
    );
    return rows;
  } catch (error) {
    console.error("getAllUsers error:", error);
    return [];
  }
};


// 🔹 Update user (handles profile updates, including image upload)
export const updateUser = async (userId, data) => {
  try {
    const fields = [];
    const values = [];

    if (data.first_name) {
      fields.push("first_name = ?");
      values.push(data.first_name);
    }
    if (data.last_name) {
      fields.push("last_name = ?");
      values.push(data.last_name);
    }
    if (data.gender) {
      fields.push("gender = ?");
      values.push(data.gender);
    }
    if (data.u_mobile) {
      fields.push("u_mobile = ?");
      values.push(data.u_mobile);
    }
    if (data.u_image) {
      fields.push("u_image = ?");
      values.push(data.u_image);
    }
    if (data.u_status) {
      fields.push("u_status = ?");
      values.push(data.u_status);
    }
    if (data.u_password) {
      fields.push("u_password = ?");
      values.push(data.u_password);
    }

    if (fields.length === 0) return false; // nothing to update

    const query = `UPDATE user SET ${fields.join(", ")}, u_updated_at = NOW() WHERE u_user_id = ?`;
    values.push(userId);

    const [result] = await pool.query(query, values);
    return result.affectedRows > 0;
  } catch (error) {
    console.error("updateUser error:", error);
    return false;
  }
};



// 🔹 Delete user by ID
export const deleteUser = async (userId) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM user WHERE u_user_id = ?",
      [userId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error("deleteUser error:", error);
    return false;
  }
};
