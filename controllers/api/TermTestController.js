import TermTestModel from "../../models/TermTestModel.js";
import { uploadToR2, deleteFromR2, getKeyFromUrl } from "../../utils/r2Upload.js";
import { streamFromR2 } from "../../utils/r2Stream.js";
import { PDFDocument } from "pdf-lib";

export default class TermTestController {

  // ---------------- CREATE ----------------
  async create(req, res) {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const { title, test_type, course_id, term_id } = req.body;

      if (!title || !test_type || !course_id || !term_id) {
        return res.status(400).json({
          success: false,
          message: "Title, test type, course and term are required",
        });
      }

      if (!req.file?.buffer) {
        return res.status(400).json({
          success: false,
          message: "PDF file is required",
        });
      }

      const file_url = await uploadToR2({
        file: req.file,
        folder: `tests/${test_type}`,
      });

      const id = await TermTestModel.create({
        title,
        test_type,
        course_id,
        term_id,
        file_url,
        is_active: 1,
      });

      res.status(201).json({ success: true, id });

    } catch (err) {
      console.error("Create test error:", err);
      res.status(500).json({ success: false, message: "Failed to create test" });
    }
  }

  // ---------------- UPDATE ----------------
  async update(req, res) {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const old = await TermTestModel.getById(req.params.id);
      if (!old) {
        return res.status(404).json({ success: false, message: "Test not found" });
      }

      let file_url = old.file_url;
      const test_type = req.body.test_type || old.test_type;

      if (req.file?.buffer) {
        if (old.file_url) {
          await deleteFromR2(getKeyFromUrl(old.file_url));
        }

        file_url = await uploadToR2({
          file: req.file,
          folder: `tests/${test_type}`,
        });
      }

      await TermTestModel.update(req.params.id, {
        ...req.body,
        test_type,
        file_url,
      });

      res.json({ success: true });

    } catch (err) {
      console.error("Update test error:", err);
      res.status(500).json({ success: false, message: "Failed to update test" });
    }
  }

  // ---------------- DELETE ----------------
  async delete(req, res) {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const old = await TermTestModel.getById(req.params.id);
      if (!old) {
        return res.status(404).json({ success: false, message: "Test not found" });
      }

      if (old.file_url) {
        await deleteFromR2(getKeyFromUrl(old.file_url));
      }

      await TermTestModel.delete(req.params.id);
      res.json({ success: true });

    } catch (err) {
      console.error("Delete test error:", err);
      res.status(500).json({ success: false, message: "Failed to delete test" });
    }
  }

  // ---------------- PREVIEW ----------------
async previewDocument(req, res) {
  try {
  console.log("PREVIEW TERM TEST ID:", req.params.id);

  const test = await TermTestModel.getById(req.params.id);
  console.log("FOUND TEST:", test);


    if (!test || !test.file_url) {
      return res.status(404).json({
        success: false,
        message: "File not available",
      });
    }

    const key = getKeyFromUrl(test.file_url);
    const stream = await streamFromR2(key);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="preview.pdf"');
    res.setHeader("Cache-Control", "no-store");


    stream.pipe(res);
  } catch (err) {
    console.error("Preview error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to preview document",
    });
  }
}

 // ---------------- DOWNLOAD (NO ENCRYPTION) ----------------
async download(req, res) {
  try {
    const test = await TermTestModel.getById(req.params.id);

    if (!test || !test.file_url) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    const key = getKeyFromUrl(test.file_url);
    const stream = await streamFromR2(key);

    // Safe filename
    const safeTitle =
      (test.title || "test")
        .replace(/[^\w\d-_]+/g, "_") + ".pdf";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeTitle}"`
    );
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");

    // ✅ Stream directly to response
    stream.pipe(res);

  } catch (err) {
    console.error("Download test error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to download test",
    });
  }
}

  // ---------------- GET BY COURSE & TERM ----------------
  async getByCourseAndTerm(req, res) {
    try {
      const { courseId, termId } = req.params;
      const tests = await TermTestModel.getByCourseAndTerm(courseId, termId);
      res.json({ success: true, data: tests });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to fetch tests" });
    }
  }
}
