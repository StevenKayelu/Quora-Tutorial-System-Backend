import express from "express";
import SubtopicController from "../../../controllers/api/SubtopicController.js";
import { verifyTokenMiddleware } from "../../../middlewares/tokenMiddleware.js";

const router = express.Router();
const subtopicController = new SubtopicController();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get("/", verifyTokenMiddleware, (req, res) => subtopicController.getAll(req, res));
router.get("/:id", verifyTokenMiddleware, (req, res) => subtopicController.getById(req, res));
router.post("/", verifyTokenMiddleware, (req, res) => subtopicController.create(req, res));
router.put("/:id", verifyTokenMiddleware, (req, res) => subtopicController.update(req, res));
router.delete("/:id", verifyTokenMiddleware, (req, res) => subtopicController.delete(req, res));
router.post("/by-topics", verifyTokenMiddleware, (req, res) => subtopicController.getByTopicIds(req, res));

router.get("*", (req, res) =>
  res.status(404).json({ success: false, message: "Page not found", error: { code: 404 } })
);

export default router;
