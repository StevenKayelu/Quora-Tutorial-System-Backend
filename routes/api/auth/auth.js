import express from "express";
import AuthController from "../../../controllers/api/AuthController.js";
import { verifyTokenMiddleware } from "../../../middlewares/tokenMiddleware.js";
import { uploadProfileImage } from "../../../middlewares/multerConfig.js";

const router = express.Router();
const authController = new AuthController();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// GET profile image inline preview
router.get("/preview/:id", verifyTokenMiddleware, async (req, res) => {
  try {
    const user = await authController.getById(req, res); // reuse existing getById logic
    const imageUrl = user?.user?.image;
    if (!imageUrl) return res.status(404).send("Profile image not found");
    // Inline display
    res.setHeader("Content-Type", "image/jpeg"); // adjust dynamically if needed
    res.setHeader("Content-Disposition", "inline; filename=profile.jpg");
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error("Profile preview error:", err);
    res.status(500).send("Error loading profile image");
  }
});

// Auth endpoints
router.post("/login", (req, res) => authController.login(req, res));
router.post("/register", (req, res) => authController.register(req, res));
router.post("/logout", (req, res) => authController.logoutController(req, res));
router.get("/verifyToken", (req, res) => authController.verifyTokenController?.(req, res));

// Refresh token endpoint
router.get("/refresh", (req, res) => authController.refresh(req, res));

// Protected user operations
router.get("/me", verifyTokenMiddleware, (req, res) => authController.getCurrentUser(req, res));
router.get("/", verifyTokenMiddleware, (req, res) => authController.getAll(req, res));
router.get("/:id", verifyTokenMiddleware, (req, res) => authController.getById(req, res));
router.put(
  "/:id",
  verifyTokenMiddleware,
  uploadProfileImage.single("image"),
  (req, res) => authController.update(req, res)
);

router.delete("/:id", verifyTokenMiddleware, (req, res) => authController.delete(req, res));
router.post("/verify-password", verifyTokenMiddleware, (req, res) => authController.verifyOldPassword(req, res));

// 404 fallback
router.get("*", (req, res) =>
  res.status(404).json({ success: false, message: "Not Found", error: { code: 404 } })
);

export default router;
