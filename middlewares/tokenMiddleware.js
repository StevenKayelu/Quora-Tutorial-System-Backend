// middlewares/tokenMiddleware.js
import { verifyRefreshToken } from "../services/jwtService.js";
import { sendErrorResponse } from "../utils/globals.js";

export const verifyTokenMiddleware = async (req, res, next) => {
  try {
    const isVerified = await verifyRefreshToken(req);

    if (
      isVerified &&
      isVerified.authStatus === 1 &&
      isVerified.data.accessToken &&
      isVerified.data.userData
    ) {
      if (isVerified.updatedToken && isVerified.data.accessToken) {
        res.setHeader("x-access-token", isVerified.data.accessToken);
      }

      req.accessToken = isVerified.data.accessToken;
      req.user = isVerified.data.userData; // <--- important
      next();
    } else {
      return sendErrorResponse(req, res, 401, "Invalid or expired token");
    }
  } catch (error) {
    console.error("verifyTokenMiddleware error:", error);
    return sendErrorResponse(req, res, 401, "Token verification failed");
  }
};


// helper used by static serving
export const verifyTokenForStatic = async (req) => {
  const isVerified = await verifyRefreshToken(req);
 if (!isVerified || isVerified.authStatus !== 1) {
  return sendErrorResponse(req, res, 401, "Unauthenticated");
}

  return null;
};
