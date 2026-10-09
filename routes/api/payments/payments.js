import express from "express";
import paymentController from "../../../controllers/api/PaymentController.js";
import { verifyTokenMiddleware } from "../../../middlewares/tokenMiddleware.js";

const router = express.Router();

// Enable JSON + form parsing
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// -------------------- MAIN PAYMENT ROUTE --------------------
router.post("/initiate", verifyTokenMiddleware, (req, res) =>
  paymentController.initiatePayment(req, res)
);

// -------------------- VERIFY MONEYUNIFY --------------------
router.post("/verify", verifyTokenMiddleware, (req, res) =>
  paymentController.verifyPayment(req, res)
);


// -------------------- 404 HANDLER --------------------
router.get("*", (req, res) =>
  res.status(404).json({
    success: false,
    message: "Page not found",
    error: { code: 404 }
  })
);

export default router;
