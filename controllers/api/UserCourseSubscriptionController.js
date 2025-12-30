import UserCourseSubscriptionModel from "../../models/UserCourseSubscriptionModel.js";

export default class UserCourseSubscriptionController {

  // ================================
  // ADMIN: Get all users with subscriptions
  // ================================
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

  // ================================
  // ADMIN: Get subscriptions for one user
  // ================================
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

      res.json({ success: true, message: "Subscription created" });
    } catch (err) {
      console.error("create:", err);
      res.status(500).json({ success: false, message: "Failed to create subscription" });
    }
  }

  //Add this to UserCourseSubscriptionController.js

static async getMyCourseIds(req, res) {
  try {
    // req.user.id comes from your auth middleware
    const userId = req.user.id; 
    const subscriptions = await UserCourseSubscriptionModel.getByUser(userId);
    
    // Map to just an array of IDs for easy comparison in the frontend
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
      await UserCourseSubscriptionModel.delete(id);
      res.json({ success: true, message: "Subscription deleted" });
    } catch (err) {
      console.error("delete:", err);
      res.status(500).json({ success: false, message: "Failed to delete subscription" });
    }
  }
}
