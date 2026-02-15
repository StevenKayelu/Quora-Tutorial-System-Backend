import db from "../../config/db.js"; // adjust path to your db connection
import UserCourseSubscriptionModel from "../../models/UserCourseSubscriptionModel.js";
import PaymentModel from "../../models/PaymentModel.js"; //  add this

export default class UserCourseSubscriptionController {

  static async getUsers(req, res) {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Access denied" });

    try {
      const data = await UserCourseSubscriptionModel.getUsersWithSubscriptions();
      res.json({ success: true, data });
    } catch (err) {
      console.error("getUsers:", err);
      res.status(500).json({ success: false, message: "Failed to fetch subscriptions" });
    }
  }

  static async getUserSubscriptions(req, res) {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Access denied" });

    try {
      const { userId } = req.params;
      const data = await UserCourseSubscriptionModel.getByUser(userId);
      res.json({ success: true, data });
    } catch (err) {
      console.error("getUserSubscriptions:", err);
      res.status(500).json({ success: false, message: "Failed to fetch user subscriptions" });
    }
  }

  // ================================
  // ADMIN: Create subscription
  // ================================
  static async create(req, res) {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Access denied" });

    try {
      const { user_id, course_id } = req.body;

      const exists = await UserCourseSubscriptionModel.exists(user_id, course_id);
      if (exists)
        return res.status(400).json({ success: false, message: "User already subscribed" });

      await UserCourseSubscriptionModel.create({
        user_id,
        course_id,
        source: "admin"
      });

      // ✅ Update user status automatically (same as SubscriptionController)
      await PaymentModel.updateUserStatus(user_id);

      res.json({ success: true, message: "Subscription created" });
    } catch (err) {
      console.error("create:", err);
      res.status(500).json({ success: false, message: "Failed to create subscription" });
    }
  }

  static async getMyCourseIds(req, res) {
    try {
      const userId = req.user.id;
      const subscriptions = await UserCourseSubscriptionModel.getByUser(userId);
      const courseIds = subscriptions.map(sub => sub.course_id);

      res.json({ success: true, data: courseIds });
    } catch (err) {
      console.error("getMyCourseIds:", err);
      res.status(500).json({ success: false, message: "Failed to fetch your subscriptions" });
    }
  }

  // ================================
  // ADMIN: Update subscription status
  // ================================
  static async updateStatus(req, res) {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Access denied" });

    try {
      const { id } = req.params;
      const { status } = req.body;

      await UserCourseSubscriptionModel.updateStatus(id, status);

      // ✅ Find user_id then update user status automatically
      const [rows] = await db.query(
        "SELECT user_id FROM user_course_subscriptions WHERE id=? LIMIT 1",
        [id]
      );

      if (rows.length) await PaymentModel.updateUserStatus(rows[0].user_id);

      res.json({ success: true, message: "Status updated" });
    } catch (err) {
      console.error("updateStatus:", err);
      res.status(500).json({ success: false, message: "Failed to update status" });
    }
  }

  // ================================
  // ADMIN: Delete subscription
  // ================================
  static async delete(req, res) {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Access denied" });

    try {
      const { id } = req.params;

      // ✅ Get user_id BEFORE deleting
      const [rows] = await db.query(
        "SELECT user_id FROM user_course_subscriptions WHERE id=? LIMIT 1",
        [id]
      );
      const userId = rows.length ? rows[0].user_id : null;

      await UserCourseSubscriptionModel.delete(id);

      // ✅ Update user status automatically after delete
      if (userId) await PaymentModel.updateUserStatus(userId);

      res.json({ success: true, message: "Subscription deleted" });
    } catch (err) {
      console.error("delete:", err);
      res.status(500).json({ success: false, message: "Failed to delete subscription" });
    }
  }
}
