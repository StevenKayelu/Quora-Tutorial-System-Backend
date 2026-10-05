// utils/tokenGenerator.js
import crypto from "crypto";

// Raw token: goes in the emailed link only, never stored.
export const generateToken = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");

// SHA-256 of the raw token: this is what gets stored and looked up in the DB.
export const hashToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

// Cheap sanity check before touching the DB (32 bytes → 64 hex chars).
export const isWellFormedToken = (token) =>
  typeof token === "string" && /^[a-f0-9]{64}$/i.test(token);
