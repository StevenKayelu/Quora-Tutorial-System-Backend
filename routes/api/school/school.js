import express from "express";
import SchoolController from "../../../controllers/api/SchoolController.js";
import { verifyTokenMiddleware } from "../../../middlewares/tokenMiddleware.js";

const router = express.Router();
const schoolController = new SchoolController();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get("/", verifyTokenMiddleware, (req, res) => schoolController.getAll(req, res));
router.get("/:id", verifyTokenMiddleware, (req, res) => schoolController.getById(req, res));
router.post("/", verifyTokenMiddleware, (req, res) => schoolController.create(req, res));
router.put("/:id", verifyTokenMiddleware, (req, res) => schoolController.update(req, res));
router.delete("/:id", verifyTokenMiddleware, (req, res) => schoolController.delete(req, res));

router.get("*", (req, res) =>
  res.status(404).json({ success: false, message: "Page not found", error: { code: 404 } })
);

export default router;
