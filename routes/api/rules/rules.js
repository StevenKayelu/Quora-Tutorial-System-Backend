import express from "express";
import multer from "multer";
import StudentRulesController from "../../../controllers/api/StudentRulesController.js";
import { verifyTokenMiddleware } from "../../../middlewares/tokenMiddleware.js";
import { isAdmin } from "../../../middlewares/roleMiddleware.js";

const router = express.Router();
const controller = new StudentRulesController();

const MAX_MB = 10;
const uploadRulesPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    file.mimetype === "application/pdf"
      ? cb(null, true)
      : cb(new Error("Only PDF files are allowed")),
}).single("file");

// Turn multer errors (wrong type, too big) into a 400 instead of a 500
const handleUpload = (req, res, next) =>
  uploadRulesPdf(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE" ? `The PDF must be ${MAX_MB} MB or smaller` : err.message;
    return res.status(400).json({ success: false, message });
  });

router.use(verifyTokenMiddleware);

router.get("/", (req, res) => controller.getCurrent(req, res));
router.get("/link", (req, res) => controller.getLink(req, res));
router.post("/", isAdmin, handleUpload, (req, res) => controller.upload(req, res));
router.delete("/", isAdmin, (req, res) => controller.remove(req, res));

export default router;
