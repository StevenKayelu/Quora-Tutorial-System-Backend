import db from "../../config/db.js";
import UserCourseSubscriptionModel from "../../models/UserCourseSubscriptionModel.js";
import PaymentModel from "../../models/PaymentModel.js";

export default class UserCourseSubscriptionController {

  // =====================================
  // ADMIN: Get all users with subscriptions
  // =====================================
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

  // =====================================
  // ADMIN: Get subscriptions for one user
  // =====================================
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

  // =====================================
  // ADMIN: Create subscription (UPDATED)
  // =====================================
  static async create(req, res) {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Access denied" });

    try {
      const { user_id, course_id, term_id } = req.body;

      if (!term_id)
        return res.status(400).json({
          success: false,
          message: "term_id is required"
        });

      const exists = await UserCourseSubscriptionModel.exists(
        user_id,
        course_id,
        term_id
      );

      if (exists)
        return res.status(400).json({
          success: false,
          message: "User already subscribed for this term"
        });

      await UserCourseSubscriptionModel.create({
        user_id,
        course_id,
        term_id,
        source: "admin"
      });

      await PaymentModel.updateUserStatus(user_id);

      res.json({ success: true, message: "Subscription created" });

    } catch (err) {
      console.error("create:", err);
      res.status(500).json({ success: false, message: "Failed to create subscription" });
    }
  }

  // =====================================
  // USER: Get only ACTIVE course IDs
  // =====================================
  static async getMyCourseIds(req, res) {
    try {
      const userId = req.user.id;
      const [rows] = await db.query(`
        SELECT course_id
        FROM user_course_subscription
        WHERE user_id = ?
          AND status = 'active'
          AND expires_at >= CURDATE()
      `, [userId]);
      
      const courseIds = rows.map(r => r.course_id);

      res.json({ success: true, data: courseIds });

    } catch (err) {
      console.error("getMyCourseIds:", err);
      res.status(500).json({ success: false, message: "Failed to fetch your subscriptions" });
    }
  }

  // =====================================
  // ADMIN: Update subscription status
  // =====================================
  static async updateStatus(req, res) {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Access denied" });

    try {
      const { id } = req.params;
      const { status } = req.body;

      await UserCourseSubscriptionModel.updateStatus(id, status);

      // FIXED TABLE NAME
      const [rows] = await db.query(
        "SELECT user_id FROM user_course_subscription WHERE id = ? LIMIT 1",
        [id]
      );

      if (rows.length)
        await PaymentModel.updateUserStatus(rows[0].user_id);

      res.json({ success: true, message: "Status updated" });

    } catch (err) {
      console.error("updateStatus:", err);
      res.status(500).json({ success: false, message: "Failed to update status" });
    }
  }

  // =====================================
  // ADMIN: Delete subscription
  // =====================================
  static async delete(req, res) {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Access denied" });

    try {
      const { id } = req.params;

      // FIXED TABLE NAME
      const [rows] = await db.query(
        "SELECT user_id FROM user_course_subscription WHERE id = ? LIMIT 1",
        [id]
      );

      const userId = rows.length ? rows[0].user_id : null;

      await UserCourseSubscriptionModel.delete(id);

      if (userId)
        await PaymentModel.updateUserStatus(userId);

      res.json({ success: true, message: "Subscription deleted" });

    } catch (err) {
      console.error("delete:", err);
      res.status(500).json({ success: false, message: "Failed to delete subscription" });
    }
  }
}
