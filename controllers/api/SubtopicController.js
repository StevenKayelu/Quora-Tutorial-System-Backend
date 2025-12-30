import SubtopicModel from "../../models/SubtopicModel.js";
import TopicMaterialModel from "../../models/TopicMaterialModel.js";
export default class SubtopicController {
  async getAll(req, res) {
    try {
      const subtopics = await SubtopicModel.getAll();
      res.status(200).json({ success: true, data: subtopics });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to load subtopics" });
    }
  }
  async getById(req, res) {
    try {
      const subtopic = await SubtopicModel.getById(req.params.id);
      if (!subtopic) return res.status(404).json({ success: false, message: "Subtopic not found" });
      res.status(200).json({ success: true, data: subtopic });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error fetching subtopic" });
    }
  }

  async create(req, res) {
    try {
      if (req.user.role !== "admin") return res.status(403).json({ success: false, message: "Access denied" });

      const { topic_id, subtopic_title, subtopic_description, is_free } = req.body;
      const id = await SubtopicModel.create({ topic_id, subtopic_title, subtopic_description, is_free });
      res.status(201).json({ success: true, message: "Subtopic created", id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error creating subtopic" });
    }
  }

  async update(req, res) {
    try {
      if (req.user.role !== "admin") return res.status(403).json({ success: false, message: "Access denied" });

      const { topic_id, subtopic_title, subtopic_description, is_free } = req.body;
      await SubtopicModel.update(req.params.id, { topic_id, subtopic_title, subtopic_description, is_free });
      res.json({ success: true, message: "Subtopic updated" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error updating subtopic" });
    }
  }

 async delete(req, res) {
  try {
     if (req.user.role !== "admin") return res.status(403).json({ success: false, message: "Access denied" });
    const subtopicId = req.params.id;

    // 1. Delete materials first
    await TopicMaterialModel.deleteBySubtopic(subtopicId);

    // 2. Delete subtopic
    await SubtopicModel.delete(subtopicId);

    res.json({ success: true, message: "Subtopic deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Delete failed" });
  }
}

  // POST /api/subtopics/by-topics
async getByTopicIds(req, res) {
  try {
    const { topicIds } = req.body;
    if (!topicIds || !Array.isArray(topicIds)) {
      return res.status(400).json({ success: false, message: "topicIds array required" });
    }

    const subtopics = await SubtopicModel.getByTopicIds(topicIds);
    res.json({ success: true, data: subtopics });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to load subtopics" });
  }
}

}
