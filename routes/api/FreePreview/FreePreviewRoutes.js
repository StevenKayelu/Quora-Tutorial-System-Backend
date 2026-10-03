import express from "express";
import FreePreviewController from "../../controllers/api/FreePreviewController.js";
import { verifyTokenMiddleware } from "../../../middlewares/tokenMiddleware.js";

const router = express.Router();
const controller = new FreePreviewController();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// ✅ Log a free view
router.post("/log", verifyTokenMiddleware, (req, res) => controller.logView(req, res));

// ✅ Get logs for a user
router.get("/user/:user_id", verifyTokenMiddleware, (req, res) => controller.getUserLogs(req, res));

// ✅ Get logs for a topic
router.get("/topic/:topic_id", verifyTokenMiddleware, (req, res) => controller.getTopicLogs(req, res));

// ✅ Delete a log
router.delete("/:id", verifyTokenMiddleware, (req, res) => controller.deleteLog(req, res));

// 404 fallback
router.get("*", (req, res) =>
  res.status(404).json({ success: false, message: "Page not found", error: { code: 404 } })
);

export default router;
