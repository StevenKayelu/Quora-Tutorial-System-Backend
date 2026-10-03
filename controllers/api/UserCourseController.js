import UserCourseModel from "../../models/UserCourseModel.js";
import UserSubscriptionModel from "../../models/UserSubscriptionModel.js";

export default class UserCourseController {
  constructor() {
    this.model = new UserCourseModel();
  }

  // -------------------- GET SUBSCRIBED SCHOOLS --------------------
  async getSubscribedSchools(req, res) {
    try {
      const userId = req.user.id;
      const schools = await this.model.getSchoolsByUser(userId);

      res.status(200).json({ success: true, data: schools });
    } catch (err) {
      console.error("getSubscribedSchools:", err);
      res.status(500).json({ success: false, message: "Failed to load subscribed schools." });
    }
  }

  // -------------------- GET SUBSCRIBED COURSES BY SCHOOL --------------------
  async getSubscribedCourses(req, res) {
    try {
      const userId = req.user.id;
      const { school_id } = req.params;
      if (!school_id) return res.status(400).json({ success: false, message: "School ID is required." });

      const courses = await this.model.getCoursesByUserAndSchool(userId, school_id);
      res.status(200).json({ success: true, data: courses });

    } catch (err) {
      console.error("getSubscribedCourses:", err);
      res.status(500).json({ success: false, message: "Failed to load subscribed courses." });
    }
  }

  // -------------------- GET USER COURSE IDS --------------------
  async getCourseIds(req, res) {
    try {
      const userId = req.user.id;
      const ids = await UserSubscriptionModel.getSubscribedCourseIds(userId);
      res.json({ success: true, data: ids });
    } catch (err) {
      console.error("getCourseIds error:", err);
      res.status(500).json({ success: false, message: "Failed to fetch course IDs." });
    }
  }

  // -------------------- CHECK IF USER IS SUBSCRIBED --------------------
  async isSubscribed(req, res) {
    try {
      const userId = req.user.id;
      const { courseId } = req.params;

      const subscribed = await UserSubscriptionModel.isSubscribed(userId, courseId);
      res.json({ success: true, subscribed });

    } catch (err) {
      console.error("isSubscribed error:", err);
      res.status(500).json({ success: false, message: "Failed to verify subscription" });
    }
  }

  // -------------------- GET FULL COURSE STRUCTURE --------------------
  async getCourseStructure(req, res) {
    try {
      const userId = req.user.id;
      const { course_id } = req.params;
      if (!course_id) return res.status(400).json({ success: false, message: "Course ID is required." });

      const structure = await this.model.getCourseStructure(userId, course_id);
      if (!structure) return res.status(403).json({ success: false, message: "Not subscribed to this course." });

      res.status(200).json({ success: true, data: structure });

    } catch (err) {
      console.error("getCourseStructure:", err);
      res.status(500).json({ success: false, message: "Failed to load course structure." });
    }
  }
}
