import express from "express";
import UserCourseController from "../../../controllers/api/UserCourseController.js";
import { verifyTokenMiddleware } from "../../../middlewares/tokenMiddleware.js";

const router = express.Router();
const userCourseController = new UserCourseController();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Get all schools user has subscribed courses in
router.get("/schools", verifyTokenMiddleware, (req, res) =>
  userCourseController.getSubscribedSchools(req, res)
);

// Get all subscribed courses under a school
router.get("/schools/:school_id/courses", verifyTokenMiddleware, (req, res) =>
  userCourseController.getSubscribedCourses(req, res)
);

// Get full structure (terms → topics → subtopics) for a subscribed course
router.get("/courses/:course_id/structure", verifyTokenMiddleware, (req, res) =>
  userCourseController.getCourseStructure(req, res)
);
router.get(
  "/is-subscribed/:courseId",
  verifyTokenMiddleware,
  (req, res) => userCourseController.isSubscribed(req, res)
);
router.get(
  "/course-ids",
  verifyTokenMiddleware,
  (req, res) => userCourseController.getCourseIds(req, res)
);

// 404 handler
router.get("*", (req, res) =>
  res.status(404).json({ success: false, message: "Page not found", error: { code: 404 } })
);

export default router;
