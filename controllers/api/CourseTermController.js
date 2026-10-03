import CourseTermModel from "../../models/CourseTermModel.js";
import TermModel from "../../models/TermModel.js";

export default class CourseTermController {
  async getTermsByCourse(req, res) {
    try {
      const courseId = Number(req.params.courseId);
      if (!courseId) return res.status(400).json({ success: false, message: "Course ID required" });

      const mappings = await CourseTermModel.getTermsByCourse(courseId);
      if (!mappings.length) return res.json({ success: true, data: [] });

      const termIds = mappings.map(m => m.term_id);
      const allTerms = await TermModel.getAll();
      const courseTerms = allTerms.filter(t => termIds.includes(t.id));

      res.json({ success: true, data: courseTerms });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to load course terms" });
    }
  }
}
