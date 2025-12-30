import express from "express";
import TopicMaterialController from "../../../controllers/api/TopicMaterialController.js";
import { verifyTokenMiddleware } from "../../../middlewares/tokenMiddleware.js";
import { uploadNotes } from "../../../middlewares/multerConfig.js";
import multer from "multer";

const router = express.Router();
const controller = new TopicMaterialController();

// For video URLs / text-only payloads
const parseFields = multer().none();

/* =====================================================
   NOTES (PDF → R2)
   - uploadNotes MUST use memoryStorage
===================================================== */
router.post(
  "/notes",
  verifyTokenMiddleware,
  uploadNotes.single("file"),
  (req, res) => controller.create(req, res)
);

router.put(
  "/notes/:id",
  verifyTokenMiddleware,
  uploadNotes.single("file"),
  (req, res) => controller.update(req, res)
);

/* =====================================================
   VIDEOS (URL only – no file)
===================================================== */
router.post(
  "/videos",
  verifyTokenMiddleware,
  parseFields,
  (req, res) => controller.create(req, res)
);

router.put(
  "/videos/:id",
  verifyTokenMiddleware,
  parseFields,
  (req, res) => controller.update(req, res)
);

/* =====================================================
   FETCH / DELETE
===================================================== */
router.get("/", verifyTokenMiddleware, (req, res) =>
  controller.getAll(req, res)
);

router.get("/:id", verifyTokenMiddleware, (req, res) =>
  controller.getById(req, res)
);

router.delete("/:id", verifyTokenMiddleware, (req, res) =>
  controller.delete(req, res)
);

/* =====================================================
   FILTER BY SUBTOPICS
===================================================== */
router.post(
  "/by-subtopics",
  verifyTokenMiddleware,
  (req, res) => controller.getBySubtopicIds(req, res)
);

/* =====================================================
   R2 STREAMING (PREVIEW / DOWNLOAD)
===================================================== */
router.get(
  "/preview/:id",
  verifyTokenMiddleware,
  (req, res) => controller.previewDocument(req, res)
);

router.get(
  "/download/:id",
  (req, res) => controller.download(req, res)
);

export default router;
