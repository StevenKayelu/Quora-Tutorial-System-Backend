import TopicMaterialModel from "../../models/TopicMaterialModel.js";
import { uploadToR2, deleteFromR2, getKeyFromUrl } from "../../utils/r2Upload.js";
import { streamFromR2 } from "../../utils/r2Stream.js";
import { PDFDocument } from "pdf-lib";


export default class TopicMaterialController {

 async create(req, res) {
  try {
    let file_url = null;

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
  } catch (error) {
    console.error("Create topic material error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload material",
    });
  }
}

async update(req, res) {
  const old = await TopicMaterialModel.getById(req.params.id);

  if (!old) {
    return res.status(404).json({
      success: false,
      message: "Material not found",
    });
  }

  let file_url = old.file_url;

  if (req.file) {
    if (old.file_url) {
      await deleteFromR2(getKeyFromUrl(old.file_url));
    }

    file_url = await uploadToR2({
      file: req.file,
      folder: "notes",
    });
  }

  await TopicMaterialModel.update(req.params.id, {
    ...req.body,
    file_url,
  });

  res.json({ success: true });
}


  async delete(req, res) {
    const old = await TopicMaterialModel.getById(req.params.id);
    if (old?.file_url) {
      await deleteFromR2(getKeyFromUrl(old.file_url));
    }

    await TopicMaterialModel.delete(req.params.id);
    res.json({ success: true });
  }

async previewDocument(req, res) {
  try {
    const material = await TopicMaterialModel.getById(req.params.id);

    if (!material || !material.file_url) {
      return res.status(404).json({
        success: false,
        message: "Document not available",
      });
    }

    const key = getKeyFromUrl(material.file_url);

    const stream = await streamFromR2(key);

    res.setHeader("Content-Type", "application/pdf");
    stream.pipe(res);

  } catch (error) {
    console.error("Preview error:", error);

    res.status(404).json({
      success: false,
      message: "File not found in storage",
    });
  }
}

// TopicController.js (or TopicMaterialController)

async download(req, res) {
  try {
    const material = await TopicMaterialModel.getById(req.params.id);

    if (!material || !material.file_url) {
      return res.status(404).json({
        success: false,
        message: "Document not available",
      });
    }

    const key = getKeyFromUrl(material.file_url);

    // 🔹 Stream directly from R2
    const stream = await streamFromR2(key);

    // 🔹 Safe filename
    const safeTitle =
      (material.title || "document")
        .replace(/[^\w\d-_]+/g, "_") + ".pdf";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeTitle}"`
    );
    res.setHeader("Cache-Control", "no-store");

    // 🔹 Pipe stream to response
    stream.pipe(res);

  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download document",
    });
  }
}


async getAll(req, res) {
  try {
    const materials = await TopicMaterialModel.getAll();
    res.json({ success: true, data: materials });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch materials",
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

    res.json({ success: true, data: material });
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

      res.json({ success: true, data: materials });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch materials",
      });
    }
  }
}

