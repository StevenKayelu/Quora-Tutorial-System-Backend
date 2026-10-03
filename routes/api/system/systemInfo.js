import { Router } from "express";
import SystemInfoController from "../../../controllers/api/SystemInfoController.js";
import { verifyTokenMiddleware } from "../../../middlewares/tokenMiddleware.js";
import { uploadImage } from "../../../middlewares/multerConfig.js";
import { uploadImageToR2,  } from "../../../utils/r2Upload.js";    
const router = Router();

router.get("/", (req, res) => SystemInfoController.fetchSystemInfo(req, res));

// Create system info
router.post(
  "/",
  verifyTokenMiddleware,
  uploadImage.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
    { name: "coursera_images", maxCount: 10 },
  ]),
  (req, res) => SystemInfoController.create(req, res)
);
//Update system info
router.put(
  "/:id",
  verifyTokenMiddleware,
  uploadImage.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
    { name: "coursera_images", maxCount: 10 },
  ]),
  (req, res) => SystemInfoController.update(req, res)
);
// Image uploads to R2 side route
router.post("/upload/single", verifyTokenMiddleware, uploadImage.single("file"), async (req, res) => {
  const url = await uploadImageToR2(req.file, "system-info");
  res.json({ url });
});

// Multiple image upload to R2 side route
router.post("/upload/multiple", verifyTokenMiddleware, uploadImage.array("files", 10), async (req, res) => {
  const urls = [];
  for (const f of req.files) {
    const url = await uploadImageToR2(f, "system-info");
    urls.push(url);
  }
  res.json({ urls });
});

// Delete system info
router.delete("/:id", verifyTokenMiddleware, (req, res) => SystemInfoController.delete(req, res));

export default router;
