import express from "express";

// Import all route modules
import apiAuthRoutes from "./auth/auth.js";
import apiSchoolRoutes from "./school/school.js";
import apiCourseRoutes from "./course/course.js";
import apiTopicRoutes from "./topic/topic.js";
import apiSubtopicRoutes from "./subtopic/subtopic.js";
import apiSubscriptionRoutes from "./subscription/subscription.js";
import apiPaymentRoutes from "./payments/payments.js";
import apiTermRoutes from "./term/term.js";
import apiUserCoursesRoutes from "./userCourses/userCourses.js";
import apiCourseTermRoutes from "./courseTerm/courseTermRoutes.js";
import apiTopicMaterialsRoutes from "./TopicMaterial/TopicMaterialRoutes.js";
import apiTermTestRoutes from "./TermTestRoutes/TermTestRoutes.js";
import apiTermTutorialRoutes from "./TermTutorialSheet/TermTutorialSheetRoutes.js";
import apiContactRoutes from "./contact/ContactInfoRoutes.js";
import systemInfoRoutes from "./system/systemInfo.js";
import apiAdminSubscriptions from "./Subscriptions/adminSubscriptions.js";
const router = express.Router();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// ✅ API ROUTES
router.use("/auth", apiAuthRoutes);
router.use("/schools", apiSchoolRoutes);
router.use("/courses", apiCourseRoutes);
router.use("/topics", apiTopicRoutes);
router.use("/subtopics", apiSubtopicRoutes);

router.use("/payments", apiPaymentRoutes);
router.use("/terms", apiTermRoutes);
router.use("/user-courses", apiUserCoursesRoutes);
router.use("/course-terms", apiCourseTermRoutes);
router.use("/topic-materials", apiTopicMaterialsRoutes);
router.use("/term-tests", apiTermTestRoutes);
router.use("/term-tutorial-sheets", apiTermTutorialRoutes);
router.use("/contact", apiContactRoutes);
router.use("/system-info", systemInfoRoutes);
router.use("/subscriptions", apiAdminSubscriptions);


// CATCH-ALL HANDLER
router.get("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "",
    data: null,
    error: {
      code: 404,
      message: "Page not found!",
    },
  });
});

export default router;
