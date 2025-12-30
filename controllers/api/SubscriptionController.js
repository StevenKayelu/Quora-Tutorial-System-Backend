import SubscriptionModel from "../../models/SubscriptionModel.js";
import PaymentModel from "../../models/PaymentModel.js";

export default class SubscriptionController {
  async getAll(req, res) {
    try {
      if (req.user.role !== 1)
        return res.status(403).json({ success: false, message: "Access denied" });

      const subs = await SubscriptionModel.getAll();
      res.json({ success: true, data: subs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to load subscriptions" });
    }
  }

  async getMySubscriptions(req, res) {
    try {
      const subs = await SubscriptionModel.getByUser(req.user.id);
      res.json({ success: true, data: subs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to load your subscriptions" });
    }
  }

  async create(req, res) {
    try {
      const { role, id } = req.user;
      const body = { ...req.body, user_id: id };

      if (role === 0 && req.body.user_id && req.body.user_id !== id)
        return res.status(403).json({ success: false, message: "Access denied" });

      const subId = await SubscriptionModel.create(body);

      // Update user subscription status automatically
      await PaymentModel.updateUserStatus(id);

      res.status(201).json({ success: true, message: "Subscription created", id: subId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error creating subscription" });
    }
  }

  async updatePaymentStatus(req, res) {
    try {
      if (req.user.role !== 1)
        return res.status(403).json({ success: false, message: "Access denied" });

      await SubscriptionModel.updatePaymentStatus(req.params.id, req.body.payment_status);

      // Automatically update user's overall subscription status
      const [sub] = await db.query("SELECT user_id FROM subscription WHERE id=? LIMIT 1", [req.params.id]);
      if (sub.length) await PaymentModel.updateUserStatus(sub[0].user_id);

      res.json({ success: true, message: "Subscription payment status updated" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error updating status" });
    }
  }
}
