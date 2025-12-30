import { verifyRefreshToken } from "../services/jwtService.js";

/**
 * Optional auth:
 * - Allows logged-in users
 * - Allows guests for preview ONLY
 */
export const previewTokenMiddleware = async (req, res, next) => {
  try {
    const verified = await verifyRefreshToken(req);

    if (verified?.authStatus === 1) {
      req.user = verified.data.userData; // optional
    }

    // Always allow preview to continue
    next();
  } catch (err) {
    // Even if token fails → allow preview
    next();
  }
};
