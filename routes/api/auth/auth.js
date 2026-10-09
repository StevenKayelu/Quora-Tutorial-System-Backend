import express from "express";
import AuthController from "../../../controllers/api/AuthController.js";
import { verifyTokenMiddleware } from "../../../middlewares/tokenMiddleware.js";
import { uploadProfileImage } from "../../../middlewares/multerConfig.js";
import { isAdmin, isAdminOrSelf } from "../../../middlewares/roleMiddleware.js";
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resendVerificationLimiter,
  resetPasswordLimiter,
} from "../../../middlewares/rateLimitMiddleware.js";

const router = express.Router();
const authController = new AuthController();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Auth endpoints
router.post("/login", loginLimiter, (req, res) => authController.login(req, res));
router.post("/register", registerLimiter, (req, res) => authController.register(req, res));
router.post("/logout", (req, res) => authController.logoutController(req, res));
router.get("/verifyToken", (req, res) => authController.verifyTokenController?.(req, res));

// Email verification & password reset
router.get("/verify-email/:token", (req, res) => authController.verifyEmail(req, res));
router.post("/resend-verification", resendVerificationLimiter, (req, res) =>
  authController.resendVerification(req, res)
);
router.post("/forgot-password", forgotPasswordLimiter, (req, res) => authController.forgotPassword(req, res));
router.post("/reset-password", resetPasswordLimiter, (req, res) => authController.resetPassword(req, res));

// Refresh token endpoint
router.get("/refresh", (req, res) => authController.refresh(req, res));

// Protected user operations
router.get("/me", verifyTokenMiddleware, (req, res) => authController.getCurrentUser(req, res));
router.get("/", verifyTokenMiddleware, isAdmin, (req, res) => authController.getAll(req, res));
router.get("/:id", verifyTokenMiddleware, isAdminOrSelf, (req, res) => authController.getById(req, res));
router.put(
  "/:id",
  verifyTokenMiddleware,
  isAdminOrSelf,
  uploadProfileImage.single("image"),
  (req, res) => authController.update(req, res)
);

router.delete("/:id", verifyTokenMiddleware, isAdmin, (req, res) => authController.delete(req, res));
router.post("/verify-password", verifyTokenMiddleware, (req, res) => authController.verifyOldPassword(req, res));

// 404 fallback
router.get("*", (req, res) =>
  res.status(404).json({ success: false, message: "Not Found", error: { code: 404 } })
);

export default router;
