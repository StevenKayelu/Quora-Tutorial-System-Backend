import express from "express";
import CourseTermController from "../../../controllers/api/CourseTermController.js";
import { verifyTokenMiddleware } from "../../../middlewares/tokenMiddleware.js";

const router = express.Router();
const controller = new CourseTermController();

router.get("/:courseId", verifyTokenMiddleware, (req, res) => controller.getTermsByCourse(req, res));
export default router;
