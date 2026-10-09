import {
  getCurrentRules,
  getAllRulesFiles,
  addRules,
  deleteRulesExcept,
} from "../../models/StudentRulesModel.js";
import { uploadToR2, deleteR2FilesQuietly, getKeyFromUrl } from "../../utils/r2Upload.js";
import { getSignedUrlFromR2 } from "../../utils/r2SignedUrl.js";

// file_url is a public storage URL, so it never leaves the server;
// students get a short-lived signed link instead (same as notes and tests).
const publicInfo = (rules) =>
  rules ? { id: rules.id, file_name: rules.file_name, updated_at: rules.created_at } : null;

const safeFilename = (name) =>
  String(name || "student-rules.pdf").replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "student-rules.pdf";

export default class StudentRulesController {
  // GET /api/rules: any logged-in user
  async getCurrent(req, res) {
    try {
      res.json({ success: true, data: publicInfo(await getCurrentRules()) });
    } catch (error) {
      console.error("rules getCurrent error:", error);
      res.status(500).json({ success: false, message: "Failed to load rules" });
    }
  }

  // GET /api/rules/link?download=1: signed URL to view or download
  async getLink(req, res) {
    try {
      const rules = await getCurrentRules();
      if (!rules) return res.status(404).json({ success: false, message: "No rules have been uploaded yet" });

      const url = await getSignedUrlFromR2(getKeyFromUrl(rules.file_url), {
        disposition: req.query.download ? "attachment" : "inline",
        filename: safeFilename(rules.file_name),
        expiresIn: 120,
      });
      res.json({ success: true, url });
    } catch (error) {
      console.error("rules getLink error:", error);
      res.status(500).json({ success: false, message: "Failed to open rules" });
    }
  }

  // POST /api/rules (admin): upload a new rules PDF, replacing the old one
  async upload(req, res) {
    try {
      if (!req.file?.buffer) {
        return res.status(400).json({ success: false, message: "Please choose a PDF file" });
      }

      const previous = await getAllRulesFiles();
      const fileUrl = await uploadToR2({ file: req.file, folder: "rules" });
      const id = await addRules({
        fileUrl,
        fileName: safeFilename(req.file.originalname),
        uploadedBy: req.user?.id,
      });

      // Only after the new file is stored: drop the old rows and files
      await deleteRulesExcept(id);
      await deleteR2FilesQuietly(previous.map((r) => r.file_url));

      res.status(201).json({ success: true, data: publicInfo(await getCurrentRules()) });
    } catch (error) {
      console.error("rules upload error:", error);
      res.status(500).json({ success: false, message: "Failed to upload rules" });
    }
  }

  // DELETE /api/rules (admin)
  async remove(req, res) {
    try {
      const files = await getAllRulesFiles();
      await deleteRulesExcept(null);
      await deleteR2FilesQuietly(files.map((r) => r.file_url));
      res.json({ success: true });
    } catch (error) {
      console.error("rules remove error:", error);
      res.status(500).json({ success: false, message: "Failed to remove rules" });
    }
  }
}
