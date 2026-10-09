import TopicMaterialModel from "../../models/TopicMaterialModel.js";
import SubtopicModel from "../../models/SubtopicModel.js";
import { uploadToR2, getKeyFromUrl, deleteR2FilesQuietly } from "../../utils/r2Upload.js";
import { getSignedUrlFromR2 } from "../../utils/r2SignedUrl.js";
import { canAccessCourse, getTopicMaterialAccessInfo, redactFileUrls } from "../../utils/courseAccess.js";
import { notifyNewTopicMaterial } from "../../services/notificationService.js";
import { getUserAcademic } from "../../models/AcademicModel.js";

// Free-preview materials are open to any logged-in user; the rest need a subscription
const canAccessMaterial = async (user, material) =>
  Number(material.access_is_free) === 1 || (await canAccessCourse(user, material.access_course_id));


export default class TopicMaterialController {

 async create(req, res) {
  try {
    let file_url = null;

    // Validate before uploading, so a bad request never leaves an orphaned file in R2
    if (!(await SubtopicModel.getById(req.body.subtopic_id))) {
      return res.status(400).json({ success: false, message: "Subtopic not found" });
    }

    if (req.body.material_type === "note") {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({
          success: false,
          message: "PDF/DOCX file is required for notes",
        });
      }

      file_url = await uploadToR2({
        file: req.file,
        folder: "notes",
      });
    }

    const id = await TopicMaterialModel.create({
      ...req.body,
      file_url,
    });

    res.status(201).json({ success: true, id });

    // After the response: tell subscribed students (never throws)
    notifyNewTopicMaterial(id);
  } catch (error) {
    console.error("Create topic material error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload material",
    });
  }
}

async update(req, res) {
  try {
    const old = await TopicMaterialModel.getById(req.params.id);

    if (!old) {
      return res.status(404).json({
        success: false,
        message: "Material not found",
      });
    }

    let file_url = old.file_url;

    // Upload the replacement first; the old file is only removed once the DB points at the new one
    if (req.file) {
      file_url = await uploadToR2({
        file: req.file,
        folder: "notes",
      });
    }

    await TopicMaterialModel.update(req.params.id, {
      ...req.body,
      file_url,
    });

    if (req.file && old.file_url) await deleteR2FilesQuietly([old.file_url]);

    res.json({ success: true });
  } catch (error) {
    console.error("Update topic material error:", error);
    res.status(500).json({ success: false, message: "Failed to update material" });
  }
}


  async delete(req, res) {
    try {
      const old = await TopicMaterialModel.getById(req.params.id);
      if (!old) {
        return res.status(404).json({ success: false, message: "Material not found" });
      }

      await TopicMaterialModel.delete(req.params.id);
      await deleteR2FilesQuietly([old.file_url]);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete topic material error:", error);
      res.status(500).json({ success: false, message: "Failed to delete material" });
    }
  }

async previewDocument(req, res) {
  try {
    const material = await getTopicMaterialAccessInfo(req.params.id);
    if (!material?.file_url) {
      return res.status(404).json({ success: false, message: "File not found" });
    }
    if (!(await canAccessMaterial(req.user, material))) {
      return res.status(403).json({ success: false, message: "Subscribe to this course to access this file" });
    }

    const key = getKeyFromUrl(material.file_url);

    const url = await getSignedUrlFromR2(key, {
      disposition: "inline",
      filename: `${material.title || "material"}.pdf`,
      expiresIn: 120,
    });

    res.json({ success: true, url });
  } catch (error) {
    console.error("Preview material error:", error);
    res.status(500).json({ success: false, message: "Failed to preview document" });
  }
}


// TopicController.js (or TopicMaterialController)

async download(req, res) {
  try {
    const material = await getTopicMaterialAccessInfo(req.params.id);
    if (!material?.file_url) {
      return res.status(404).json({ success: false, message: "File not found" });
    }
    if (!(await canAccessMaterial(req.user, material))) {
      return res.status(403).json({ success: false, message: "Subscribe to this course to access this file" });
    }

    const key = getKeyFromUrl(material.file_url);
    const safeTitle =
      (material.title || "material").replace(/[^\w\d-_]+/g, "_") + ".pdf";

    const url = await getSignedUrlFromR2(key, {
      disposition: "attachment",
      filename: safeTitle,
      expiresIn: 120,
    });

    res.json({ success: true, url });
  } catch (error) {
    console.error("Download material error:", error);
    res.status(500).json({ success: false, message: "Failed to download document" });
  }
}



async getAll(req, res) {
  try {
    const materials = await TopicMaterialModel.getAll();
    res.json({ success: true, data: redactFileUrls(req.user, materials) });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch materials",
    });
  }
}

// Free-preview materials across all schools (any logged-in user)
async getFree(req, res) {
  try {
    let materials = await TopicMaterialModel.getFreeWithContext();
    // Students only see free lessons offered at their own school; admins see all
    if (req.user?.role !== "admin") {
      const academic = await getUserAcademic(req.user?.id);
      materials = academic?.school_id
        ? materials.filter((m) => Number(m.school_id) === Number(academic.school_id))
        : [];
    }
    res.json({ success: true, data: redactFileUrls(req.user, materials) });
  } catch (error) {
    console.error("Get free materials error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch free materials",
    });
  }
}

async getById(req, res) {
  try {
    const material = await TopicMaterialModel.getById(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material not found",
      });
    }

    res.json({ success: true, data: redactFileUrls(req.user, material) });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch material",
    });
  }
}

  // ✅ FIXED METHOD
  async getBySubtopicIds(req, res) {
    try {
      const { subtopicIds, material_type } = req.body;

      if (!Array.isArray(subtopicIds) || !subtopicIds.length) {
        return res.status(400).json({
          success: false,
          message: "subtopicIds must be a non-empty array",
        });
      }

      const materials = await TopicMaterialModel.getBySubtopicIds(
        subtopicIds,
        material_type || null
      );

      res.json({ success: true, data: redactFileUrls(req.user, materials) });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch materials",
      });
    }
  }
}
