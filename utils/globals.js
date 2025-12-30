// utils/globals.js
import { add, endOfDay, getUnixTime } from "date-fns";
import { toZonedTime } from "date-fns-tz";

// Convert between role number and role string
export const convertToRoleData = (value) => {
  if (value === undefined || value === null) return null;

  if (typeof value === "number") {
    switch (value) {
      case 1:
        return "admin";
      case 0:
        return "user";
      default:
        return null;
    }
  }

  if (typeof value === "string") {
    switch (value.toLowerCase()) {
      case "admin":
        return 1;
      case "user":
        return 0;
      default:
        return null;
    }
  }

  return null;
};

// Calculate time in seconds for access/refresh tokens
export function dateTimeHandler(value, type, action) {
  if (!value || !type || !action) return null;

  const timeZone = "Asia/Kolkata";

  try {
    if (type === "seconds" && action === "inc") {
      const currentDate = toZonedTime(new Date(), timeZone);
      const finalDate = add(currentDate, { seconds: value });
      return getUnixTime(finalDate) - getUnixTime(currentDate);
    }

    if (type === "daysEnd" && action === "inc") {
      const currentDate = toZonedTime(new Date(), timeZone);
      const incrementedDate = add(currentDate, { days: value });
      const finalDate = endOfDay(incrementedDate);
      return getUnixTime(finalDate) - getUnixTime(currentDate);
    }
  } catch (error) {
    console.error(error);
  }

  return null;
}

// Standard success response
export function sendSuccessResponse(req, res, message, data) {
  const auth = {};
  const { authenticated, accessToken, refreshToken, userData } = req;
  if (authenticated) auth.authenticated = authenticated;
  if (accessToken) auth.accessToken = accessToken;
  if (refreshToken) auth.refreshToken = refreshToken;
  if (userData) auth.user = userData;

  return res.json({
    success: true,
    auth: auth,
    message: message || "",
    data: data || null,
    error: null,
  });
}

// Standard error response
export function sendErrorResponse(req, res, statusCode = 400, message = "An error occurred") {
  return res.status(statusCode).json({
    success: false,
    message: message,
    auth: null,
    data: null,
    error: {
      code: statusCode,
      message: message,
    },
  });
}

