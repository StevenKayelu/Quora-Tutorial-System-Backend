import TopicModel from "../../models/TopicModel.js";

export default class TopicController {
  async getAll(req, res) {
    try {
      const topics = await TopicModel.getAll();
      res.status(200).json({ success: true, data: topics });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to load topics" });
    }
  }

  async getById(req, res) {
    try {
      const topic = await TopicModel.getById(req.params.id);
      if (!topic) return res.status(404).json({ success: false, message: "Topic not found" });
      res.status(200).json({ success: true, data: topic });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error fetching topic" });
    }
  }

  async create(req, res) {
    try {
      if (req.user.role !== "admin") return res.status(403).json({ success: false, message: "Access denied" });

      const {course_id, term_id, topic_title, topic_description } = req.body;
      const id = await TopicModel.create({ course_id, term_id, topic_title, topic_description });
      res.status(201).json({ success: true, message: "Topic created", id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error creating topic" });
    }
  }

  async update(req, res) {
    try {
      if (req.user.role !== "admin") return res.status(403).json({ success: false, message: "Access denied" });

      const { course_id, term_id, topic_title, topic_description } = req.body;

      await TopicModel.update(req.params.id, {
        course_id,
        term_id,
        topic_title,
        topic_description,
      });

      res.json({ success: true, message: "Topic updated" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error updating topic" });
    }
  }
async getByCourseAndTerm(req, res) {
  try {
    const { course_id, term_id } = req.params;

    const topics = await TopicModel.getByCourseAndTerm(course_id, term_id);

    return res.status(200).json({
      success: true,
      data: topics,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch topics",
    });
  }
}





  async delete(req, res) {
    try {
      if (req.user.role !== "admin") return res.status(403).json({ success: false, message: "Access denied" });

      await TopicModel.delete(req.params.id);
      res.json({ success: true, message: "Topic deleted" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error deleting topic" });
    }
  }
}
