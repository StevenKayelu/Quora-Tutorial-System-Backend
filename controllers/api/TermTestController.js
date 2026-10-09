import TermTestModel from "../../models/TermTestModel.js";
import { notifyNewTermTest } from "../../services/notificationService.js";
import { uploadToR2, getKeyFromUrl, deleteR2FilesQuietly } from "../../utils/r2Upload.js";
import { getSignedUrlFromR2 } from "../../utils/r2SignedUrl.js";
import { canAccessCourse, redactFileUrls } from "../../utils/courseAccess.js";

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

      // After the response: tell subscribed students (never throws)
      notifyNewTermTest(id);

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

      // Upload the replacement first; the old file is removed after the DB update
      if (req.file?.buffer) {
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

      if (file_url !== old.file_url) await deleteR2FilesQuietly([old.file_url]);
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

      await TermTestModel.delete(req.params.id);
      await deleteR2FilesQuietly([old.file_url]);
      res.json({ success: true });

    } catch (err) {
      console.error("Delete test error:", err);
      res.status(500).json({ success: false, message: "Failed to delete test" });
    }
  }

  // ---------------- PREVIEW ----------------
async previewDocument(req, res) {
  try {
    const test = await TermTestModel.getById(req.params.id);
    if (!test?.file_url) {
      return res.status(404).json({ success: false, message: "File not found" });
    }
    if (!(await canAccessCourse(req.user, test.course_id))) {
      return res.status(403).json({ success: false, message: "Subscribe to this course to access this file" });
    }

    const key = getKeyFromUrl(test.file_url);

    const url = await getSignedUrlFromR2(key, {
      disposition: "inline",
      filename: `${test.title || "test"}.pdf`,
      expiresIn: 120,
    });

    res.json({ success: true, url });
  } catch (err) {
    console.error("Preview test error:", err);
    res.status(500).json({ success: false, message: "Failed to preview test" });
  }
}


 // ---------------- DOWNLOAD (NO ENCRYPTION) ----------------
async download(req, res) {
  try {
    const test = await TermTestModel.getById(req.params.id);
    if (!test?.file_url) {
      return res.status(404).json({ success: false, message: "File not found" });
    }
    if (!(await canAccessCourse(req.user, test.course_id))) {
      return res.status(403).json({ success: false, message: "Subscribe to this course to access this file" });
    }

    const key = getKeyFromUrl(test.file_url);
    const safeTitle =
      (test.title || "test").replace(/[^\w\d-_]+/g, "_") + ".pdf";

    const url = await getSignedUrlFromR2(key, {
      disposition: "attachment",
      filename: safeTitle,
      expiresIn: 120,
    });

    res.json({ success: true, url });
  } catch (err) {
    console.error("Download test error:", err);
    res.status(500).json({ success: false, message: "Failed to download test" });
  }
}


  // ---------------- GET BY COURSE & TERM ----------------
  async getByCourseAndTerm(req, res) {
    try {
      const { courseId, termId } = req.params;
      const tests = await TermTestModel.getByCourseAndTerm(courseId, termId);
      res.json({ success: true, data: redactFileUrls(req.user, tests) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to fetch tests" });
    }
  }
}
