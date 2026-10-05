import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  getUserByEmail,
  getUserByUserId,
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser,
  registerUserInDb,
  getLastUserId,
  setEmailVerificationToken,
  getUserByEmailVerificationToken,
  markEmailVerified,
  setPasswordResetToken,
  getUserByPasswordResetToken,
  resetPasswordWithToken,
  getUserLoginState,
  clearExpiredLockout,
  recordFailedLogin,
  resetFailedLogins,
} from "../../models/AuthModel.js";
import { sign, verifyRefreshToken } from "../../services/jwtService.js";
import { cryptoAESEncryption } from "../../services/encryptionService.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../../services/mailService.js";
import { convertToRoleData, sendErrorResponse, sendSuccessResponse } from "../../utils/globals.js";
import { uploadToR2 } from "../../utils/r2Upload.js";
import { generateToken, hashToken, isWellFormedToken } from "../../utils/tokenGenerator.js";
import { isValidPassword, PASSWORD_POLICY_MESSAGE } from "../../utils/passwordPolicy.js";

const VERIFICATION_TOKEN_TTL_HOURS = 24;
const PASSWORD_RESET_TOKEN_TTL_MINUTES = 60;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// Same response whether or not the account exists, so these endpoints can't be
// used to discover which emails are registered.
const RESEND_VERIFICATION_MESSAGE =
  "If an unverified account exists for that email, a new verification link has been sent.";
const FORGOT_PASSWORD_MESSAGE =
  "If an account exists for that email, a password reset link has been sent.";

// Base URL of the frontend, used for links in emails
const getPublicUrl = () =>
  (process.env.VITE_PUBLIC_URL || "http://localhost:5173").replace(/\/+$/, "");

// Issue a fresh verification token (stores only its hash) and email the raw token
const issueVerificationEmail = async (userId, email, firstName) => {
  const rawToken = generateToken();
  const stored = await setEmailVerificationToken(userId, hashToken(rawToken), VERIFICATION_TOKEN_TTL_HOURS);
  if (!stored) return false;

  return sendVerificationEmail({
    to: email,
    firstName,
    link: `${getPublicUrl()}/verify-email/${rawToken}`,
  });
};


class AuthController {
   // ===== REGISTER =====
async register(req, res) {
  try {
    const { firstName, lastName, gender, email, password, mobile } = req.body || {};
    if (!firstName || !lastName || !gender || !email || !password || !mobile)
      return sendErrorResponse(req, res, 400, "Missing required fields");

    // Validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const mobileRegex = /^[0-9]{10}$/;

    if (!emailRegex.test(email)) return sendErrorResponse(req, res, 400, "Invalid email format");
    if (!mobileRegex.test(mobile)) return sendErrorResponse(req, res, 400, "Mobile number must be exactly 10 digits");
    if (!isValidPassword(password)) return sendErrorResponse(req, res, 400, PASSWORD_POLICY_MESSAGE);

    // Check if email already exists
    const existingByEmail = await getUserByEmail(email.toLowerCase());
    if (existingByEmail) return sendErrorResponse(req, res, 409, "Email already in use");

    // Generate new user ID
    const yearPrefix = new Date().getFullYear().toString().slice(-2);
    const lastUserId = await getLastUserId(yearPrefix);
    const newUserId = lastUserId ? String(Number(lastUserId) + 1) : `${yearPrefix}00001`;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ===== Role mapping (string → integer) =====
    const roleMapping = {
      user: 0,
      admin: 1,
    };
    const roleInt = roleMapping["user"]; // Default role

    // Insert user into DB
    const user = await registerUserInDb(
      newUserId,
      firstName,
      lastName,
      gender,
      email.toLowerCase(),
      hashedPassword,
      mobile,
      roleInt,
      "unsubscribed"
    );

    if (!user) return sendErrorResponse(req, res, 500, "Registration failed. Please try again.");

    // Send email verification link (user is NOT logged in until they verify).
    // If this fails the account still exists; they can use "resend verification".
    const emailSent = await issueVerificationEmail(newUserId, email.toLowerCase(), firstName);
    if (!emailSent) console.error(`register: failed to send verification email for user ${newUserId}`);

    // Prepare user data for response
    const userData = {
      id: newUserId,
      firstName,
      lastName,
      gender,
      email: email.toLowerCase(),
      mobile,
      image: null,
      role: "user",          // Keep role string for frontend
      roleValue: convertToRoleData("user", true),
      status: "unsubscribed",
    };

    return sendSuccessResponse(
      req,
      res,
      "Registration successful. Please check your email to verify your account before logging in.",
      { user: userData }
    );
  } catch (error) {
    console.error("register error:", error);
    return sendErrorResponse(req, res, 500, "Internal server error during registration.");
  }
}


  // ===== LOGIN =====
  async login(req, res) {
    try {
      const { userId, email, password, staySignedIn } = req.body || {};
      const identifier = userId || email;
      if (!identifier || !password)
        return sendErrorResponse(req, res, 400, "Provide both User ID/email and password.");

      const user = identifier.includes("@")
        ? await getUserByEmail(identifier.toLowerCase())
        : await getUserByUserId(identifier);

      if (!user) return sendErrorResponse(req, res, 404, "No account found with that User ID or email.");

      // Lockout check happens before the password is even compared
      const loginState = await getUserLoginState(user.u_user_id);
      if (!loginState) return sendErrorResponse(req, res, 500, "Login failed.");

      if (loginState.lockout_seconds_remaining > 0) {
        const minutes = Math.ceil(loginState.lockout_seconds_remaining / 60);
        return sendErrorResponse(
          req,
          res,
          423,
          `Account temporarily locked due to too many failed login attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
        );
      }
      if (loginState.lockout_expired) await clearExpiredLockout(user.u_user_id);

      const hash = user.u_password.replace(/^\$2y(.+)$/i, "$2b$1");
      const passwordValid = await bcrypt.compare(password, hash);
      if (!passwordValid) {
        const failed = await recordFailedLogin(user.u_user_id, MAX_FAILED_LOGIN_ATTEMPTS, LOCKOUT_MINUTES);
        if (failed?.lockout_seconds_remaining > 0) {
          return sendErrorResponse(
            req,
            res,
            423,
            `Incorrect password. Too many failed attempts - your account has been locked for ${LOCKOUT_MINUTES} minutes.`
          );
        }
        if (failed) {
          const attemptsLeft = Math.max(MAX_FAILED_LOGIN_ATTEMPTS - failed.failed_login_attempts, 0);
          return sendErrorResponse(
            req,
            res,
            401,
            `Incorrect password. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining before your account is temporarily locked.`
          );
        }
        return sendErrorResponse(req, res, 401, "Incorrect password.");
      }

      // Correct password: reset the failed-attempt counter
      if (loginState.failed_login_attempts > 0) {
        await resetFailedLogins(user.u_user_id);
      }

      // Unverified accounts can't log in, even with the right password
      if (!loginState.email_verified_at) {
        return sendErrorResponse(
          req,
          res,
          403,
          "Please verify your email address before logging in. Check your inbox for the verification link, or request a new one."
        );
      }

      const userData = {
        id: user.id,
        uUserId: user.u_user_id,
        userId: user.u_user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.u_email,
        mobile: user.u_mobile,
        image: user.u_image,
        role: convertToRoleData(user.u_role),
        roleValue: convertToRoleData(user.u_role, true),
        status: user.u_status,
      };

      const encUser = await cryptoAESEncryption(JSON.stringify(userData));
      const encUserId = await cryptoAESEncryption(user.u_user_id);

      const refreshToken = await sign(encUserId, staySignedIn ? 15 * 24 * 60 * 60 : 24 * 60 * 60);
      const accessToken = await sign(encUser, 15 * 60);

      res.cookie("yttmrtck", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/", // ✅ FIXED
        maxAge: (staySignedIn ? 15 * 24 * 60 * 60 : 24 * 60 * 60) * 1000,
      });

      return sendSuccessResponse(req, res, "Successfully authenticated!", { accessToken, user: userData });
    } catch (error) {
      console.error("login error:", error);
      return sendErrorResponse(req, res, 500, "Login failed.");
    }
  }

 // ===== REFRESH TOKEN =====
async refresh(req, res) {
  try {
    const cookie = req.cookies.yttmrtck;

    // If no cookie, do not log out
    if (!cookie) {
      return sendSuccessResponse(req, res, "no-refresh", { accessToken: null, user: null });
    }

    const verification = await verifyRefreshToken(req);

    if (verification.authStatus === -1) {
      // Expired
      res.clearCookie("yttmrtck", { path: "/" });
      return sendErrorResponse(req, res, 440, "Session expired");
    }

    if (verification.authStatus !== 1) {
      // Invalid
      res.clearCookie("yttmrtck", { path: "/" });
      return sendErrorResponse(req, res, 401, "Invalid session");
    }

    return sendSuccessResponse(req, res, "Token refreshed", {
      accessToken: verification.data.accessToken,
      user: verification.data.userData,
    });

  } catch (error) {
    console.error("refresh error:", error);

    // Unknown error → DO NOT logout
    return sendSuccessResponse(req, res, "refresh-failed-soft", {
      accessToken: null,
      user: null,
    });
  }
}
// ===== VERIFY OLD PASSWORD =====
async verifyOldPassword(req, res) {
  try {
    const userId = req.user?.id;
    const { oldPassword } = req.body;

    if (!oldPassword)
      return sendErrorResponse(req, res, 400, "Old password is required");

    const user = await getUserByUserId(userId);
    if (!user) return sendErrorResponse(req, res, 404, "User not found");

    // Convert $2y$ → $2b$ if needed
    const hash = user.u_password.replace(/^\$2y(.+)$/i, "$2b$1");

    const valid = await bcrypt.compare(oldPassword, hash);
    if (!valid) return sendErrorResponse(req, res, 401, "Old password incorrect");

    return sendSuccessResponse(req, res, "Old password is valid");
  } catch (err) {
    console.error("verifyOldPassword error:", err);
    return sendErrorResponse(req, res, 500, "Error verifying password");
  }
}

  // ===== VERIFY EMAIL =====
  async verifyEmail(req, res) {
    try {
      const { token } = req.params;
      const invalidMessage = "This verification link is invalid or has already been used.";
      if (!isWellFormedToken(token)) return sendErrorResponse(req, res, 400, invalidMessage);

      const tokenHash = hashToken(token);
      const record = await getUserByEmailVerificationToken(tokenHash);
      if (!record) return sendErrorResponse(req, res, 400, invalidMessage);
      if (Number(record.token_expired))
        return sendErrorResponse(req, res, 400, "This verification link has expired. Please request a new one.");

      const verified = await markEmailVerified(tokenHash);
      if (!verified) return sendErrorResponse(req, res, 400, invalidMessage);

      return sendSuccessResponse(req, res, "Email verified successfully. You can now log in.");
    } catch (error) {
      console.error("verifyEmail error:", error);
      return sendErrorResponse(req, res, 500, "Error verifying email.");
    }
  }

  // ===== RESEND VERIFICATION EMAIL =====
  async resendVerification(req, res) {
    try {
      const { email } = req.body || {};
      if (!email || typeof email !== "string") return sendErrorResponse(req, res, 400, "Email is required");

      const user = await getUserByEmail(email.trim().toLowerCase());
      if (user) {
        const state = await getUserLoginState(user.u_user_id);
        if (state && !state.email_verified_at) {
          const sent = await issueVerificationEmail(user.u_user_id, user.u_email, user.first_name);
          if (!sent) console.error(`resendVerification: failed to send email for user ${user.u_user_id}`);
        }
      }

      return sendSuccessResponse(req, res, RESEND_VERIFICATION_MESSAGE);
    } catch (error) {
      console.error("resendVerification error:", error);
      return sendErrorResponse(req, res, 500, "Error resending verification email.");
    }
  }

  // ===== FORGOT PASSWORD =====
  async forgotPassword(req, res) {
    try {
      const { email } = req.body || {};
      if (!email || typeof email !== "string") return sendErrorResponse(req, res, 400, "Email is required");

      const user = await getUserByEmail(email.trim().toLowerCase());
      if (user) {
        const rawToken = generateToken();
        const stored = await setPasswordResetToken(
          user.u_user_id,
          hashToken(rawToken),
          PASSWORD_RESET_TOKEN_TTL_MINUTES
        );
        const sent =
          stored &&
          (await sendPasswordResetEmail({
            to: user.u_email,
            firstName: user.first_name,
            link: `${getPublicUrl()}/reset-password/${rawToken}`,
          }));
        if (!sent) console.error(`forgotPassword: failed to issue reset email for user ${user.u_user_id}`);
      }

      return sendSuccessResponse(req, res, FORGOT_PASSWORD_MESSAGE);
    } catch (error) {
      console.error("forgotPassword error:", error);
      return sendErrorResponse(req, res, 500, "Error processing password reset request.");
    }
  }

  // ===== RESET PASSWORD =====
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body || {};
      if (!token || !newPassword)
        return sendErrorResponse(req, res, 400, "Reset token and new password are required");
      if (!isValidPassword(newPassword)) return sendErrorResponse(req, res, 400, PASSWORD_POLICY_MESSAGE);

      const invalidMessage = "This password reset link is invalid or has already been used.";
      if (!isWellFormedToken(token)) return sendErrorResponse(req, res, 400, invalidMessage);

      const tokenHash = hashToken(token);
      const record = await getUserByPasswordResetToken(tokenHash);
      if (!record) return sendErrorResponse(req, res, 400, invalidMessage);
      if (Number(record.token_expired))
        return sendErrorResponse(req, res, 400, "This password reset link has expired. Please request a new one.");

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updated = await resetPasswordWithToken(tokenHash, hashedPassword);
      if (!updated) return sendErrorResponse(req, res, 400, invalidMessage);

      return sendSuccessResponse(req, res, "Your password has been reset. You can now log in with your new password.");
    } catch (error) {
      console.error("resetPassword error:", error);
      return sendErrorResponse(req, res, 500, "Error resetting password.");
    }
  }



  // ===== LOGOUT =====
 async logoutController(req, res) {
  res.clearCookie("yttmrtck", { path: "/" });

  // Invalidate authorization header usage
  res.setHeader("Clear-Site-Data", '"cookies", "storage"');

  return sendSuccessResponse(req, res, "Logged out successfully");
}


// ===== GET CURRENT USER =====
  async getCurrentUser(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return sendErrorResponse(req, res, 401, "Unauthorized");

      const user = await getUserById(userId);
      if (!user) return sendErrorResponse(req, res, 404, "User not found");

      const userData = {
        id: user.id,
        uUserId: user.u_user_id,
        userId: user.u_user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.u_email,
        mobile: user.u_mobile,
        image: user.u_image,
        role: convertToRoleData(user.u_role),
        roleValue: convertToRoleData(user.u_role, true),
        status: user.u_status,
      };

      return sendSuccessResponse(req, res, "Current user fetched successfully", { user: userData });
    } catch (err) {
      console.error("getCurrentUser error:", err);
      return sendErrorResponse(req, res, 500, "Error fetching current user");
    }
  }

  // ===== GET ALL USERS =====
  async getAll(req, res) {
    try {
      const users = await getAllUsers();
      const formatted = users.map(u => ({
        id: u.u_user_id,
        firstName: u.first_name,
        lastName: u.last_name,
        gender: u.gender,
        email: u.u_email,
        mobile: u.u_mobile,
        image: u.u_image,
        role: convertToRoleData(u.u_role),
        roleValue: convertToRoleData(u.u_role, true),
        status: u.u_status,
      }));
      return sendSuccessResponse(req, res, "Users fetched successfully", { users: formatted });
    } catch (error) {
      console.error("getAll error:", error);
      return sendErrorResponse(req, res, 500, "Error fetching users");
    }
  }

  // ===== GET USER BY ID =====
  async getById(req, res) {
    try {
      const { id } = req.params;
      const user = await getUserByUserId(id);
      if (!user) return sendErrorResponse(req, res, 404, "User not found");

      const userData = {
        id: user.id,
        uUserId: user.u_user_id,
        userId: user.u_user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.u_email,
        mobile: user.u_mobile,
        image: user.u_image,
        role: convertToRoleData(user.u_role),
        roleValue: convertToRoleData(user.u_role, true),
        status: user.u_status,
      };

      return sendSuccessResponse(req, res, "User fetched successfully", { user: userData });
    } catch (error) {
      console.error("getById error:", error);
      return sendErrorResponse(req, res, 500, "Error fetching user");
    }
  }

  // ===== UPDATE USER =====
  async update(req, res) {
    try {
      const { id } = req.params;
      const { firstName, lastName, gender, mobile, newPassword } = req.body;

      const user = await getUserByUserId(id);
      if (!user) return sendErrorResponse(req, res, 404, "User not found");

      // 🔐 Password update (already solid)
      if (newPassword) {
        const hashed = await bcrypt.hash(newPassword, 10);
        await updateUser(id, { u_password: hashed });
      }


      // 🖼 Profile image → R2
      let imageUrl = user.u_image;
      if (req.file) {
       imageUrl = await uploadToR2({
        file: req.file,
        folder: "profile-images",
      });

      }

      if (!imageUrl) {
        return sendErrorResponse(req, res, 500, "Image upload failed");
      }
      await updateUser(id, {
        first_name: firstName,
        last_name: lastName,
        gender,
        u_mobile: mobile,
        u_image: imageUrl,
        u_status: user.u_status,
      });

      const updated = await getUserByUserId(id);

      return sendSuccessResponse(req, res, "Profile updated", {
        id: updated.u_user_id,
        firstName: updated.first_name,
        lastName: updated.last_name,
        email: updated.u_email,
        gender: updated.gender,
        mobile: updated.u_mobile,
        image: updated.u_image,
        role: convertToRoleData(updated.u_role),
        roleValue: convertToRoleData(updated.u_role, true),
        status: updated.u_status,
      });
    } catch (err) {
      console.error("update error:", err);
      return sendErrorResponse(req, res, 500, "Profile update failed");
    }
  }

  // ===== DELETE USER =====
  async delete(req, res) {
    try {
      const { id } = req.params;
      const success = await deleteUser(id);
      if (!success) return sendErrorResponse(req, res, 404, "User not found or already deleted.");
      return sendSuccessResponse(req, res, "User deleted successfully.");
    } catch (error) {
      console.error("delete error:", error);
      return sendErrorResponse(req, res, 500, "Error deleting user.");
    }
  }
}

export default AuthController;


