import CourseModel from "../../models/CourseModel.js";
import CourseTermModel from "../../models/CourseTermModel.js";
import { schoolExists } from "../../models/AcademicModel.js";

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

      // Optional: other schools this course is also offered at
      const { shared_school_ids } = req.body;
      if (Array.isArray(shared_school_ids)) {
        await CourseModel.setSharedSchools(id, shared_school_ids, school_id);
      }

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
          shared_school_ids: Array.isArray(req.body.shared_school_ids) ? req.body.shared_school_ids : [],
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

      // Only touch sharing when the client sends it
      const { shared_school_ids } = req.body;
      if (Array.isArray(shared_school_ids)) {
        await CourseModel.setSharedSchools(req.params.id, shared_school_ids, school_id);
      }
      res.json({ success: true, message: "Course updated" });
    } catch (err) {
      console.error("update error:", err);
      res.status(500).json({ success: false, message: "Error updating course" });
    }
  }

  // Assign already-made courses to a school (shared, main school unchanged)
  async assignToSchool(req, res) {
    try {
      if (req.user.role !== "admin")
        return res.status(403).json({ success: false, message: "Access denied" });

      const schoolId = Number(req.body?.school_id);
      const courseIds = Array.isArray(req.body?.course_ids) ? req.body.course_ids : [];
      if (!schoolId || !courseIds.length)
        return res.status(400).json({ success: false, message: "Select a school and at least one course" });
      if (!(await schoolExists(schoolId)))
        return res.status(404).json({ success: false, message: "School not found" });

      const assigned = await CourseModel.assignCoursesToSchool(schoolId, courseIds);
      res.json({
        success: true,
        message: `${assigned} ${assigned === 1 ? "course" : "courses"} assigned`,
        data: { assigned },
      });
    } catch (err) {
      console.error("assignToSchool error:", err);
      res.status(500).json({ success: false, message: "Error assigning courses" });
    }
  }

  // Remove a course from one of its shared schools
  async unassignFromSchool(req, res) {
    try {
      if (req.user.role !== "admin")
        return res.status(403).json({ success: false, message: "Access denied" });

      const course = await CourseModel.getById(req.params.id);
      if (!course) return res.status(404).json({ success: false, message: "Course not found" });
      if (Number(course.school_id) === Number(req.params.schoolId))
        return res.status(400).json({
          success: false,
          message: "That's the course's main school. Change the main school in Edit instead.",
        });

      const removed = await CourseModel.unassignCourseFromSchool(course.id, req.params.schoolId);
      if (!removed)
        return res.status(404).json({ success: false, message: "Course isn't assigned to that school" });

      res.json({ success: true, message: "Course removed from school" });
    } catch (err) {
      console.error("unassignFromSchool error:", err);
      res.status(500).json({ success: false, message: "Error removing course from school" });
    }
  }

  async delete(req, res) {
    try {
      if (req.user.role !== "admin")
        return res.status(403).json({ success: false, message: "Access denied" });

      await CourseModel.delete(req.params.id);
      res.json({ success: true, message: "Course deleted" });
    } catch (err) {
      if (err.code === "COURSE_IN_USE")
        return res.status(409).json({ success: false, message: err.message });
      console.error("delete error:", err);
      res.status(500).json({ success: false, message: "Error deleting course" });
    }
  }
}
