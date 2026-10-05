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
          id,
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
          id,
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
      "SELECT * FROM user WHERE id = ?",
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


// ===================================================================
// Email verification / password reset / lockout
// All expiry and lockout comparisons are done in SQL against NOW(), so
// they're consistent regardless of the Node process's timezone.
// Token columns hold SHA-256 hashes, never raw tokens.
// ===================================================================

// 🔹 Store a (hashed) email verification token
export const setEmailVerificationToken = async (userId, tokenHash, expiresInHours) => {
  try {
    const [result] = await pool.query(
      `UPDATE user
       SET email_verification_token = ?,
           email_verification_expires = DATE_ADD(NOW(), INTERVAL ? HOUR)
       WHERE u_user_id = ?`,
      [tokenHash, expiresInHours, userId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error("setEmailVerificationToken error:", error);
    return false;
  }
};

// 🔹 Look up a user by (hashed) verification token; token_expired is 1 if past expiry
export const getUserByEmailVerificationToken = async (tokenHash) => {
  if (!tokenHash) return null;

  try {
    const [rows] = await pool.query(
      `SELECT
          u_user_id,
          u_email,
          email_verified_at,
          (email_verification_expires IS NULL OR email_verification_expires <= NOW()) AS token_expired
        FROM user
        WHERE email_verification_token = ?
        LIMIT 1`,
      [tokenHash]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("getUserByEmailVerificationToken error:", error);
    return null;
  }
};

// 🔹 Mark email verified and consume the token (only if still valid)
export const markEmailVerified = async (tokenHash) => {
  try {
    const [result] = await pool.query(
      `UPDATE user
       SET email_verified_at = NOW(),
           email_verification_token = NULL,
           email_verification_expires = NULL
       WHERE email_verification_token = ?
         AND email_verification_expires > NOW()`,
      [tokenHash]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error("markEmailVerified error:", error);
    return false;
  }
};

// 🔹 Store a (hashed) password reset token
export const setPasswordResetToken = async (userId, tokenHash, expiresInMinutes) => {
  try {
    const [result] = await pool.query(
      `UPDATE user
       SET password_reset_token = ?,
           password_reset_expires = DATE_ADD(NOW(), INTERVAL ? MINUTE)
       WHERE u_user_id = ?`,
      [tokenHash, expiresInMinutes, userId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error("setPasswordResetToken error:", error);
    return false;
  }
};

// 🔹 Look up a user by (hashed) reset token; token_expired is 1 if past expiry
export const getUserByPasswordResetToken = async (tokenHash) => {
  if (!tokenHash) return null;

  try {
    const [rows] = await pool.query(
      `SELECT
          u_user_id,
          u_email,
          (password_reset_expires IS NULL OR password_reset_expires <= NOW()) AS token_expired
        FROM user
        WHERE password_reset_token = ?
        LIMIT 1`,
      [tokenHash]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("getUserByPasswordResetToken error:", error);
    return null;
  }
};

// 🔹 Set a new password via a reset token, consuming the token in the same statement
//    (so it can only be used once). Also clears any lockout, and marks the email as
//    verified - completing a reset proves the user controls the address.
export const resetPasswordWithToken = async (tokenHash, hashedPassword) => {
  try {
    const [result] = await pool.query(
      `UPDATE user
       SET u_password = ?,
           password_reset_token = NULL,
           password_reset_expires = NULL,
           failed_login_attempts = 0,
           lockout_until = NULL,
           email_verified_at = COALESCE(email_verified_at, NOW()),
           u_updated_at = NOW()
       WHERE password_reset_token = ?
         AND password_reset_expires > NOW()`,
      [hashedPassword, tokenHash]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error("resetPasswordWithToken error:", error);
    return false;
  }
};

// 🔹 Verification + lockout state used by login / resend-verification
export const getUserLoginState = async (userId) => {
  if (!userId) return null;

  try {
    const [rows] = await pool.query(
      `SELECT
          email_verified_at,
          failed_login_attempts,
          lockout_until,
          IF(lockout_until > NOW(), TIMESTAMPDIFF(SECOND, NOW(), lockout_until), 0) AS lockout_seconds_remaining,
          (lockout_until IS NOT NULL AND lockout_until <= NOW()) AS lockout_expired
        FROM user
        WHERE u_user_id = ?
        LIMIT 1`,
      [userId]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("getUserLoginState error:", error);
    return null;
  }
};

// 🔹 Once a lockout has expired, start counting failed attempts from zero again.
//    Conditional on the lockout actually having expired, so it's safe to race.
export const clearExpiredLockout = async (userId) => {
  try {
    const [result] = await pool.query(
      `UPDATE user
       SET failed_login_attempts = 0,
           lockout_until = NULL
       WHERE u_user_id = ?
         AND lockout_until IS NOT NULL
         AND lockout_until <= NOW()`,
      [userId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error("clearExpiredLockout error:", error);
    return false;
  }
};

// 🔹 Record a failed login atomically: increment the counter and, if this attempt
//    reaches maxAttempts, set lockout_until - all in one statement, so near-simultaneous
//    requests can't race past the threshold. lockout_until is assigned first and only
//    reads the pre-increment counter, so the result doesn't depend on assignment order.
//    Returns the updated { failed_login_attempts, lockout_seconds_remaining }.
export const recordFailedLogin = async (userId, maxAttempts, lockoutMinutes) => {
  try {
    await pool.query(
      `UPDATE user
       SET lockout_until = IF(
             failed_login_attempts + 1 >= ?,
             DATE_ADD(NOW(), INTERVAL ? MINUTE),
             lockout_until
           ),
           failed_login_attempts = failed_login_attempts + 1
       WHERE u_user_id = ?`,
      [maxAttempts, lockoutMinutes, userId]
    );

    const [rows] = await pool.query(
      `SELECT
          failed_login_attempts,
          IF(lockout_until > NOW(), TIMESTAMPDIFF(SECOND, NOW(), lockout_until), 0) AS lockout_seconds_remaining
        FROM user
        WHERE u_user_id = ?
        LIMIT 1`,
      [userId]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("recordFailedLogin error:", error);
    return null;
  }
};

// 🔹 Reset the failed-login counter after a successful password check
export const resetFailedLogins = async (userId) => {
  try {
    const [result] = await pool.query(
      `UPDATE user
       SET failed_login_attempts = 0,
           lockout_until = NULL
       WHERE u_user_id = ?`,
      [userId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error("resetFailedLogins error:", error);
    return false;
  }
};
