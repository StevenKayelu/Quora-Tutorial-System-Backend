import jwt from "jsonwebtoken";
import fs from "fs/promises";
import path from "path";
import { cryptoAESDecryption, cryptoAESEncryption } from "./encryptionService.js";
import { getUserByUserId } from "../models/AuthModel.js";
import { convertToRoleData } from "../utils/globals.js";

const rootDir = process.cwd();
const privateKeyPath = path.join(rootDir, "/certs/jwtRS256.key");
const publicKeyPath = path.join(rootDir, "/certs/jwtRS256.key.pub");
const privateKey = await fs.readFile(privateKeyPath);
const publicKey = await fs.readFile(publicKeyPath);

export const sign = async (data, seconds = 30 * 60 * 60 * 24) => {
  if (!data) return null;
  try {
    return jwt.sign({ payload: data }, privateKey, { algorithm: "RS256", expiresIn: seconds });
  } catch {
    return null;
  }
};

export const verifyToken = (token) => {
  if (!token) return null;
  try {
    return jwt.verify(token, publicKey, { algorithm: "RS256" });
  } catch {
    return null;
  }
};

export const verifyRefreshToken = async (req) => {
  const responseData = {
    authStatus: 0,
    updatedToken: false,
    data: { accessToken: null, userData: null },
  };

  const accessTok = req.headers?.authorization?.split(" ")[1] || "";
  const refreshTok = req.cookies?.yttmrtck;

  if (!accessTok && !refreshTok) return responseData;

  // Try access token first
  let decryptedUser = null;
  const accessTokenValid = verifyToken(accessTok);

  if (accessTokenValid?.payload) {
    const decrypted = await cryptoAESDecryption(accessTokenValid.payload).catch(() => null);
    if (decrypted) {
      try {
        decryptedUser = JSON.parse(decrypted); // ✅ parse to object
      } catch (err) {
        console.error("Failed to parse decrypted access token:", err);
      }
    }
  }

  // If access token invalid, try refresh token
  if (!decryptedUser && refreshTok) {
    const refreshTokenValid = verifyToken(refreshTok);
    if (refreshTokenValid?.payload) {
      const userDec = await cryptoAESDecryption(refreshTokenValid.payload).catch(() => null);
      if (userDec) {
        const user = await getUserByUserId(userDec);
        if (user) {
          decryptedUser = {
            id: user.u_user_id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.u_email,
            gender: user.gender,
            mobile: user.u_mobile,
            image: user.u_image,
            role: user.u_role ? convertToRoleData(user.u_role) : "User",
            roleValue: user.u_role || 0,
            status: user.u_status || "unsubscribed",
          };

          const encUser = await cryptoAESEncryption(JSON.stringify(decryptedUser)).catch(() => null);
          const newAccessToken = await sign(encUser, 30 * 60).catch(() => null);

          responseData.updatedToken = true;
          responseData.data.accessToken = newAccessToken;
        }
      }
    }
  }

  if (decryptedUser) {
    responseData.authStatus = 1;
    responseData.data.userData = decryptedUser;
    if (!responseData.data.accessToken) responseData.data.accessToken = accessTok;
  }

  return responseData;
};
