import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  getUserByEmail,
  getUserByUserId,
  getAllUsers,
  updateUser,
  deleteUser,
  registerUserInDb,
  getLastUserId,
} from "../../models/AuthModel.js";
import { sign, verifyRefreshToken } from "../../services/jwtService.js";
import { cryptoAESEncryption } from "../../services/encryptionService.js";
import { convertToRoleData, sendErrorResponse, sendSuccessResponse } from "../../utils/globals.js";
import { uploadToR2 } from "../../utils/r2Upload.js";


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
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{7}$/;

    if (!emailRegex.test(email)) return sendErrorResponse(req, res, 400, "Invalid email format");
    if (!mobileRegex.test(mobile)) return sendErrorResponse(req, res, 400, "Mobile number must be exactly 10 digits");
    if (!passwordRegex.test(password))
      return sendErrorResponse(
        req,
        res,
        400,
        "Password must be exactly 7 characters with at least one letter and one number"
      );

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

    return sendSuccessResponse(req, res, "Registration successfully.", { user: userData });
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

      const hash = user.u_password.replace(/^\$2y(.+)$/i, "$2b$1");
      const passwordValid = await bcrypt.compare(password, hash);
      if (!passwordValid) return sendErrorResponse(req, res, 401, "Incorrect password.");

      const userData = {
        id: user.u_user_id,
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

      const user = await getUserByUserId(userId);
      if (!user) return sendErrorResponse(req, res, 404, "User not found");

      const userData = {
        id: user.u_user_id,
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
        id: user.u_user_id,
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


