import CourseModel from "../../models/CourseModel.js";
import CourseTermModel from "../../models/CourseTermModel.js";

export default class CourseController {
  async getAll(req, res) {
    try {
      const courses = await CourseModel.getAll();
      res.status(200).json({ success: true, data: courses });
    } catch (err) {
      console.error("getAll error:", err);
      res.status(500).json({ success: false, message: "Failed to load courses" });
    }
  }

  async getById(req, res) {
    try {
      const course = await CourseModel.getById(req.params.id);
      if (!course) return res.status(404).json({ success: false, message: "Course not found" });

      // fetch terms assigned to this course
      const terms = await CourseTermModel.getTermsByCourse(course.id);
      course.terms = terms.map(t => t.term_id);

      res.status(200).json({ success: true, data: course });
    } catch (err) {
      console.error("getById error:", err);
      res.status(500).json({ success: false, message: "Error fetching course" });
    }
  }

  async create(req, res) {
    try {
      if (req.user.role !== "admin")
        return res.status(403).json({ success: false, message: "Access denied" });

      const { school_id, course_name, course_description, amount } = req.body;

      if (!course_name || isNaN(amount))
        return res.status(400).json({ success: false, message: "Invalid input" });

      const id = await CourseModel.create({ school_id, course_name, course_description, amount });

      // Fetch assigned terms for the newly created course
      const terms = await CourseTermModel.getTermsByCourse(id);

      res.status(201).json({
        success: true,
        message: "Course created",
        data: {
          id,
          school_id,
          course_name,
          course_description,
          amount,
          terms: terms.map(t => t.term_id),
        },
      });
    } catch (err) {
      console.error("create error:", err);
      res.status(500).json({ success: false, message: "Error creating course" });
    }
  }

  async update(req, res) {
    try {
      if (req.user.role !== "admin")
        return res.status(403).json({ success: false, message: "Access denied" });

      const { school_id, course_name, course_description, amount } = req.body;

      if (!course_name || isNaN(amount))
        return res.status(400).json({ success: false, message: "Invalid input" });

      await CourseModel.update(req.params.id, { school_id, course_name, course_description, amount });
      res.json({ success: true, message: "Course updated" });
    } catch (err) {
      console.error("update error:", err);
      res.status(500).json({ success: false, message: "Error updating course" });
    }
  }

  async delete(req, res) {
    try {
      if (req.user.role !== "admin")
        return res.status(403).json({ success: false, message: "Access denied" });

      await CourseModel.delete(req.params.id);
      res.json({ success: true, message: "Course deleted" });
    } catch (err) {
      console.error("delete error:", err);
      res.status(500).json({ success: false, message: "Error deleting course" });
    }
  }
}
