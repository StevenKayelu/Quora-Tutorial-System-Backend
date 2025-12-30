import express from "express";
import SubscriptionController from "../../../controllers/api/SubscriptionController.js";
import { verifyTokenMiddleware } from "../../../middlewares/tokenMiddleware.js";

const router = express.Router();
const subscriptionController = new SubscriptionController();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get("/", verifyTokenMiddleware, (req, res) => subscriptionController.getAll(req, res));
router.get("/mine", verifyTokenMiddleware, (req, res) => subscriptionController.getMySubscriptions(req, res));
router.post("/", verifyTokenMiddleware, (req, res) => subscriptionController.create(req, res));
router.put("/:id/payment-status", verifyTokenMiddleware, (req, res) => subscriptionController.updatePaymentStatus(req, res));

router.get("*", (req, res) =>
  res.status(404).json({ success: false, message: "Page not found", error: { code: 404 } })
);

export default router;
