import express from "express";
import AcademicController from "../../../controllers/api/AcademicController.js";
import { verifyTokenMiddleware } from "../../../middlewares/tokenMiddleware.js";
import { isAdmin } from "../../../middlewares/roleMiddleware.js";

const router = express.Router();
const controller = new AcademicController();

router.use(express.json());

// Public: school + year dropdowns on the registration page
router.get("/options", (req, res) => controller.getOptions(req, res));

// Logged-in user's own school + year
router.get("/me", verifyTokenMiddleware, (req, res) => controller.getMine(req, res));
router.put("/me", verifyTokenMiddleware, (req, res) => controller.updateMine(req, res));

// Admin: manage the study year list
router.get("/years", verifyTokenMiddleware, isAdmin, (req, res) => controller.listYears(req, res));

// Admin: change any user's school and year (students can't change their school)
router.get("/users/:userId", verifyTokenMiddleware, isAdmin, (req, res) => controller.getForUser(req, res));
router.put("/users/:userId", verifyTokenMiddleware, isAdmin, (req, res) => controller.updateForUser(req, res));
router.post("/years", verifyTokenMiddleware, isAdmin, (req, res) => controller.createYear(req, res));
router.put("/years/reorder", verifyTokenMiddleware, isAdmin, (req, res) => controller.reorderYears(req, res));
router.put("/years/:id", verifyTokenMiddleware, isAdmin, (req, res) => controller.updateYear(req, res));
router.delete("/years/:id", verifyTokenMiddleware, isAdmin, (req, res) => controller.deleteYear(req, res));

router.get("*", (req, res) =>
  res.status(404).json({ success: false, message: "Page not found", error: { code: 404 } })
);

export default router;
