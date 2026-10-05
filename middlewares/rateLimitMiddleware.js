// middlewares/rateLimitMiddleware.js
import rateLimit from "express-rate-limit";
import { sendErrorResponse } from "../utils/globals.js";

// NOTE: these limiters use express-rate-limit's default in-memory store, keyed by
// client IP (resolved via app.set("trust proxy", 1) in app.js). That's correct for a
// single backend process, but counters are per-process: if this ever runs as multiple
// instances/processes (PM2 cluster, several containers, etc.), switch to a shared
// store such as Redis (rate-limit-redis) so limits apply across all of them.

const createLimiter = ({ windowMs, limit, message }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res) => sendErrorResponse(req, res, 429, message),
  });

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export const loginLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: 10,
  message: "Too many login attempts. Please try again in 15 minutes.",
});

export const registerLimiter = createLimiter({
  windowMs: HOUR,
  limit: 10,
  message: "Too many registration attempts. Please try again later.",
});

export const forgotPasswordLimiter = createLimiter({
  windowMs: HOUR,
  limit: 5,
  message: "Too many password reset requests. Please try again later.",
});

export const resendVerificationLimiter = createLimiter({
  windowMs: HOUR,
  limit: 5,
  message: "Too many verification email requests. Please try again later.",
});

export const resetPasswordLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: 10,
  message: "Too many password reset attempts. Please try again in 15 minutes.",
});
