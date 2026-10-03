import FreePreviewLogModel from "../../models/FreePreviewLogModel.js";

export default class FreePreviewController {
  async logView(req, res) {
    try {
      const { user_id, topic_id } = req.body;
      if (!user_id || !topic_id) {
        return res.status(400).json({ success: false, message: "Missing parameters" });
      }

      const id = await FreePreviewLogModel.logView({ user_id, topic_id });
      res.json({ success: true, message: "View logged", id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to log view" });
    }
  }

  async getUserLogs(req, res) {
    try {
      const user_id = req.params.user_id;
      const logs = await FreePreviewLogModel.getByUser(user_id);
      res.json({ success: true, data: logs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to fetch logs" });
    }
  }

  async getTopicLogs(req, res) {
    try {
      const topic_id = req.params.topic_id;
      const logs = await FreePreviewLogModel.getByTopic(topic_id);
      res.json({ success: true, data: logs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to fetch logs" });
    }
  }

  async deleteLog(req, res) {
    try {
      const id = req.params.id;
      const affected = await FreePreviewLogModel.deleteLog(id);
      res.json({ success: true, message: "Deleted", affected });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to delete log" });
    }
  }
}
