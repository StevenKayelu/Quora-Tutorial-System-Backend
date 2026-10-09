import express from "express";
import NotificationController from "../../../controllers/api/NotificationController.js";
import { verifyTokenMiddleware } from "../../../middlewares/tokenMiddleware.js";

const router = express.Router();
const controller = new NotificationController();

router.use(express.json());
router.use(verifyTokenMiddleware);

// The logged-in user's own notifications
router.get("/", (req, res) => controller.list(req, res));
router.get("/unread-count", (req, res) => controller.unreadCount(req, res));
router.put("/read-all", (req, res) => controller.markAllAsRead(req, res));
router.put("/:id/read", (req, res) => controller.markOneRead(req, res));

router.get("*", (req, res) =>
  res.status(404).json({ success: false, message: "Page not found", error: { code: 404 } })
);

export default router;
