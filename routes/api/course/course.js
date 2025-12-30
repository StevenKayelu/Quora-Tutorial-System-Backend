import express from "express";
import CourseController from "../../../controllers/api/CourseController.js";
import { verifyTokenMiddleware } from "../../../middlewares/tokenMiddleware.js";

const router = express.Router();
const courseController = new CourseController();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get("/", verifyTokenMiddleware, (req, res) => courseController.getAll(req, res));
router.get("/:id", verifyTokenMiddleware, (req, res) => courseController.getById(req, res));
router.post("/", verifyTokenMiddleware, (req, res) => courseController.create(req, res));
router.put("/:id", verifyTokenMiddleware, (req, res) => courseController.update(req, res));
router.delete("/:id", verifyTokenMiddleware, (req, res) => courseController.delete(req, res));

router.get("*", (req, res) =>
  res.status(404).json({ success: false, message: "Page not found", error: { code: 404 } })
);

export default router;
