import express from "express";
import TermTutorialSheetController from "../../../controllers/api/TermTutorialSheetController.js";
import { uploadTutorialSheet } from "../../../middlewares/multerConfig.js";
import { verifyTokenMiddleware } from "../../../middlewares/tokenMiddleware.js";

const router = express.Router();
const controller = new TermTutorialSheetController();

// ⚠️ IMPORTANT
// Do NOT use express.json() or express.urlencoded()
// Multer will handle multipart/form-data

// GET ALL
router.get("/", verifyTokenMiddleware, (req, res) =>
  controller.getAll(req, res)
);

// GET BY ID
router.get("/:id", verifyTokenMiddleware, (req, res) =>
  controller.getById(req, res)
);

// GET BY COURSE & TERM
router.get(
  "/courses/:course_id/terms/:term_id",
  verifyTokenMiddleware,
  (req, res) => controller.getByCourseAndTerm(req, res)
);

// CREATE (FILE REQUIRED)
router.post(
  "/",
  verifyTokenMiddleware,
  uploadTutorialSheet.single("file"),
  (req, res) => controller.create(req, res)
);

// UPDATE (FILE REQUIRED)
router.put(
  "/:id",
  verifyTokenMiddleware,
  uploadTutorialSheet.single("file"),
  (req, res) => controller.update(req, res)
);

// DELETE
router.delete("/:id", verifyTokenMiddleware, (req, res) =>
  controller.delete(req, res)
);

// PREVIEW
router.get("/preview/:id", verifyTokenMiddleware, (req, res) =>
  controller.previewDocument(req, res)
);

// DOWNLOAD
router.get("/download/:id", verifyTokenMiddleware, (req, res) =>
  controller.download(req, res)
);


export default router;
