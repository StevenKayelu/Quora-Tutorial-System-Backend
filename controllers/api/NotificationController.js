import {
  getNotificationsForUser,
  countUnreadForUser,
  markRead,
  markAllRead,
} from "../../models/NotificationModel.js";

export default class NotificationController {
  async list(req, res) {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
      const [items, unread] = await Promise.all([
        getNotificationsForUser(req.user.id, limit),
        countUnreadForUser(req.user.id),
      ]);
      res.json({ success: true, data: { items, unread } });
    } catch (error) {
      console.error("notifications list error:", error);
      res.status(500).json({ success: false, message: "Failed to load notifications" });
    }
  }

  async unreadCount(req, res) {
    try {
      res.json({ success: true, data: { unread: await countUnreadForUser(req.user.id) } });
    } catch (error) {
      console.error("notifications unreadCount error:", error);
      res.status(500).json({ success: false, message: "Failed to load notifications" });
    }
  }

  async markOneRead(req, res) {
    try {
      await markRead(req.user.id, req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("notifications markOneRead error:", error);
      res.status(500).json({ success: false, message: "Failed to update notification" });
    }
  }

  async markAllAsRead(req, res) {
    try {
      await markAllRead(req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("notifications markAllAsRead error:", error);
      res.status(500).json({ success: false, message: "Failed to update notifications" });
    }
  }
}
