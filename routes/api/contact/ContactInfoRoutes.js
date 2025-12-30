import { Router } from "express";
import ContactInfoController from "../../../controllers/api/ContactInfoController.js";
import { uploadMemory } from "../../../middlewares/multerMemory.js";
import { verifyTokenMiddleware } from "../../../middlewares/tokenMiddleware.js";

const router = Router();

router.post(
  "/",
  verifyTokenMiddleware,
  uploadMemory.single("contact_video"),
  (req, res) => ContactInfoController.create(req, res)
);

router.put(
  "/:id",
  verifyTokenMiddleware,
  uploadMemory.single("contact_video"),
  (req, res) => ContactInfoController.update(req, res)
);

router.get("/", (req, res) =>
  ContactInfoController.fetch(req, res)
);

router.delete("/:id", verifyTokenMiddleware, (req, res) =>
  ContactInfoController.delete(req, res)
);

export default router;
