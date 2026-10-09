import express from "express";
import TopicMaterialController from "../../../controllers/api/TopicMaterialController.js";
import { verifyTokenMiddleware } from "../../../middlewares/tokenMiddleware.js";
import { isAdmin } from "../../../middlewares/roleMiddleware.js";
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
  isAdmin,
  uploadNotes.single("file"),
  (req, res) => controller.create(req, res)
);

router.put(
  "/notes/:id",
  verifyTokenMiddleware,
  isAdmin,
  uploadNotes.single("file"),
  (req, res) => controller.update(req, res)
);

/* =====================================================
   VIDEOS (URL only – no file)
===================================================== */
router.post(
  "/videos",
  verifyTokenMiddleware,
  isAdmin,
  parseFields,
  (req, res) => controller.create(req, res)
);

router.put(
  "/videos/:id",
  verifyTokenMiddleware,
  isAdmin,
  parseFields,
  (req, res) => controller.update(req, res)
);

/* =====================================================
   FETCH / DELETE
===================================================== */
router.get("/", verifyTokenMiddleware, (req, res) =>
  controller.getAll(req, res)
);

// Must stay above "/:id"
router.get("/free", verifyTokenMiddleware, (req, res) =>
  controller.getFree(req, res)
);

router.get("/:id", verifyTokenMiddleware, (req, res) =>
  controller.getById(req, res)
);

router.delete("/:id", verifyTokenMiddleware, isAdmin, (req, res) =>
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
  verifyTokenMiddleware,
  (req, res) => controller.download(req, res)
);

export default router;
