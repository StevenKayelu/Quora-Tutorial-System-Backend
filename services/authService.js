import bcrypt from "bcrypt";
import { sign } from "./jwtService.js";
import { cryptoAESEncryption } from "./encryptionService.js";
import { getUserByEmail, getUserByUserId, getLastUserId, registerUserInDb } from "../models/AuthModel.js";
import { convertToRoleData } from "../utils/globals.js";

// ===== REGISTER USER =====
export async function registerUser(firstName, lastName, email, password) {

  if (!firstName || !lastName || !email || !password) {
    return { success: false, message: "Missing required fields" };
  }

  try {
    // Check for existing email
    const existingUser = await getUserByEmail(email);
    if (existingUser) return { success: false, message: "Email already exists" };

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    if (!hashedPassword) return { success: false, message: "Password hashing failed" };

    // Generate custom ID (YY + 5 digits)
    const yearPrefix = new Date().getFullYear().toString().slice(-2); // "25"
    let lastId = await getLastUserId(yearPrefix); // e.g. "2500042"
    let newSeq = lastId ? parseInt(lastId.slice(2), 10) + 1 : 1;
    const userId = `${yearPrefix}${String(newSeq).padStart(5, "0")}`; // "2500001"

    // Default values
    const userRole = "0";
    const userStatus = "unsubscribed";

    // Insert into DB
    const newUser = await registerUserInDb(
      userId, firstName, lastName, email, hashedPassword, userRole, userStatus
    );

    if (!newUser) return { success: false, message: "Failed to create user" };

    return { success: true, message: "Registration successful", userId };
  } catch (error) {
    console.error("registerUser exception:", error);
    return { success: false, message: "Internal server error" };
  }
}

// ===== AUTHENTICATE USER =====
export async function authenticateUser(identifier, password, expiryTime) {
  if (!identifier || !password || !expiryTime) return null;

  let user;

  // Trim input
  const cleanIdentifier = identifier.trim();

  // 🔹 Identify if it's an email or user ID
  if (cleanIdentifier.includes("@")) {
    user = await getUserByEmail(cleanIdentifier.toLowerCase());
  } else {
    user = await getUserByUserId(cleanIdentifier);
  }

  if (!user) {
    return null;
  }

  // 🔹 Fix bcrypt hash prefix
  const hash = user.u_password.replace(/^\$2y(.+)$/i, "$2b$1");
  const verified = await bcrypt.compare(password, hash).catch(() => false);

  if (!verified) {
    return null;
  }

  // 🔹 Prepare user data
  const userData = {
    id: user.u_user_id,
    firstName: user.first_name,
    lastName: user.last_name,
    gender: user.gender,
    email: user.u_email,
    mobile: user.u_mobile,
    image: user.u_image,
    role: user.u_role ? convertToRoleData(user.u_role).toLowerCase() : "user",
    roleValue: user.u_role,
  };
  

  const encUser = await cryptoAESEncryption(JSON.stringify(userData)).catch(() => null);
  const encUserId = await cryptoAESEncryption(user.u_user_id).catch(() => null);

  const refreshToken = await sign(encUserId, expiryTime).catch(() => null);
  const accessToken = await sign(encUser, 2 * 60).catch(() => null);

  if (!refreshToken || !accessToken) return null;

  return { refreshToken, accessToken, user: userData, authenticated: true };
}



