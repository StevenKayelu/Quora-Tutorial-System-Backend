import express from "express";
import TermController from "../../../controllers/api/TermController.js";
import { verifyTokenMiddleware } from "../../../middlewares/tokenMiddleware.js";

const router = express.Router();
const termController = new TermController();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get("/", verifyTokenMiddleware, (req, res) => termController.getAll(req, res));
router.get("/:id", verifyTokenMiddleware, (req, res) => termController.getById(req, res));
router.post("/", verifyTokenMiddleware, (req, res) => termController.create(req, res));
router.put("/:id", verifyTokenMiddleware, (req, res) => termController.update(req, res));
router.delete("/:id", verifyTokenMiddleware, (req, res) => termController.delete(req, res));

router.get("*", (req, res) =>
  res.status(404).json({ success: false, message: "Page not found", error: { code: 404 } })
);

export default router;
