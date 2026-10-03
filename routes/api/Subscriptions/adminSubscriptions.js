import express from "express";
import PaymentTransactionController from "../../../controllers/api/PaymentTransactionController.js";
import UserCourseSubscriptionController from "../../../controllers/api/UserCourseSubscriptionController.js";
import { verifyTokenMiddleware } from "../../../middlewares/tokenMiddleware.js";
const router = express.Router();

/* ============================
   PAYMENT TRANSACTIONS (ADMIN)
   ============================ */
router.get(
  "/transactions",
  verifyTokenMiddleware,
  (req, res) => PaymentTransactionController.getAll(req, res)
);
router.get(
  "/my-ids",
  verifyTokenMiddleware,
  (req, res) => UserCourseSubscriptionController.getMyCourseIds(req, res)
);

router.get(
  "/transactions/:id",
  verifyTokenMiddleware,
  (req, res) => PaymentTransactionController.getDetails(req, res)
);

router.delete(
    "/transactions/:id",
    verifyTokenMiddleware,
    (req,res)=>PaymentTransactionController.delete(req,res)
)

/* ============================
   USER COURSE SUBSCRIPTIONS (ADMIN)
   ============================ */

/**
 * GET all users with all their subscribed courses
 * Used for admin overview tables
 */
router.get(
  "/users",
  verifyTokenMiddleware,
  (req, res) => UserCourseSubscriptionController.getUsers(req, res)
);

/**
 * GET subscriptions for a specific user
 */
router.get(
  "/users/:userId",
  verifyTokenMiddleware,
  (req, res) => UserCourseSubscriptionController.getUserSubscriptions(req, res)
);

/**
 * ADD course subscription to a user
 */
router.post(
  "/",
  verifyTokenMiddleware,
  (req, res) => UserCourseSubscriptionController.create(req, res)
);

/**
 * UPDATE subscription status (active / inactive)
 */
router.patch(
  "/:id",
  verifyTokenMiddleware,
  (req, res) => UserCourseSubscriptionController.updateStatus(req, res)
);

/**
 * DELETE a subscription
 */
router.delete(
  "/:id",
  verifyTokenMiddleware,
  (req, res) => UserCourseSubscriptionController.delete(req, res)
);

export default router;
