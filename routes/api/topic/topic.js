import express from "express";
import TopicController from "../../../controllers/api/TopicController.js";
import { verifyTokenMiddleware } from "../../../middlewares/tokenMiddleware.js";

const router = express.Router();
const topicController = new TopicController();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get("/", verifyTokenMiddleware, (req, res) => topicController.getAll(req, res));

router.get("/courses/:course_id/terms/:term_id/topics", verifyTokenMiddleware, (req, res) =>  
  topicController.getByCourseAndTerm(req, res)
);
router.get("/:id", verifyTokenMiddleware, (req, res) => topicController.getById(req, res));
router.post("/", verifyTokenMiddleware, (req, res) => topicController.create(req, res));
router.put("/:id", verifyTokenMiddleware, (req, res) => topicController.update(req, res));
router.delete("/:id", verifyTokenMiddleware, (req, res) => topicController.delete(req, res));

router.get("*", (req, res) =>
  res.status(404).json({ success: false, message: "Page not found", error: { code: 404 } })
);

export default router;
