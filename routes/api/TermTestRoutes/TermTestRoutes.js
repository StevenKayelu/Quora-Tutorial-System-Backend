import express from "express";
import TermTestController from "../../../controllers/api/TermTestController.js";
import { uploadTermTest } from "../../../middlewares/multerConfig.js";
import { verifyTokenMiddleware } from "../../../middlewares/tokenMiddleware.js";
import { previewTokenMiddleware } from "../../../middlewares/previewTokenMiddleware.js";

const router = express.Router();
const controller = new TermTestController();

//preview route for r2 streamed files
// File access
router.get(
  "/preview/:id",
 verifyTokenMiddleware,
  controller.previewDocument.bind(controller)
);

router.get("/download/:id", verifyTokenMiddleware, controller.download.bind(controller));
export default router;


router.post("/", verifyTokenMiddleware, uploadTermTest.single("file"), controller.create.bind(controller));
router.put("/:id", verifyTokenMiddleware, uploadTermTest.single("file"), controller.update.bind(controller));
router.delete("/:id", verifyTokenMiddleware, controller.delete.bind(controller));

// Fetch
router.get("/course/:courseId/term/:termId", verifyTokenMiddleware, controller.getByCourseAndTerm.bind(controller));

