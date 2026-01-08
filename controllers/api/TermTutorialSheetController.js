import TermTutorialSheetModel from "../../models/TermTutorialSheetModel.js";
import { uploadToR2, deleteFromR2, getKeyFromUrl } from "../../utils/r2Upload.js";
import { streamFromR2 } from "../../utils/r2Stream.js";
import { getSignedUrlFromR2 } from "../../utils/r2SignedUrl.js";
import { PDFDocument } from "pdf-lib";

export default class TermTutorialSheetController {

  // ---------------- CREATE ----------------
  async create(req, res) {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      if (!req.file?.buffer) {
        return res.status(400).json({ success: false, message: "PDF file is required" });
      }

      const file_url = await uploadToR2({
        file: req.file,
        folder: "tutorial-sheets",
      });

      const id = await TermTutorialSheetModel.create({
        course_id: req.body.course_id,
        term_id: req.body.term_id,
        title: req.body.title,
        file_url,
      });

      res.status(201).json({ success: true, id });
    } catch (err) {
      console.error("Create tutorial sheet error:", err);
      res.status(500).json({ success: false, message: "Failed to create sheet" });
    }
  }

  // ---------------- UPDATE ----------------
  async update(req, res) {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const old = await TermTutorialSheetModel.getById(req.params.id);
      if (!old) return res.status(404).json({ success: false, message: "Sheet not found" });

      let file_url = old.file_url;

      if (req.file?.buffer) {
        if (old.file_url) {
          await deleteFromR2(getKeyFromUrl(old.file_url));
        }

        file_url = await uploadToR2({
          file: req.file,
          folder: "tutorial-sheets",
        });
      }

      await TermTutorialSheetModel.update(req.params.id, {
        course_id: req.body.course_id,
        term_id: req.body.term_id,
        title: req.body.title,
        file_url,
      });

      res.json({ success: true });
    } catch (err) {
      console.error("Update tutorial sheet error:", err);
      res.status(500).json({ success: false, message: "Failed to update sheet" });
    }
  }

  // ---------------- DELETE ----------------
  async delete(req, res) {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const old = await TermTutorialSheetModel.getById(req.params.id);
      if (!old) return res.status(404).json({ success: false, message: "Sheet not found" });

      if (old.file_url) {
        await deleteFromR2(getKeyFromUrl(old.file_url));
      }

      await TermTutorialSheetModel.delete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete tutorial sheet error:", err);
      res.status(500).json({ success: false, message: "Failed to delete sheet" });
    }
  }

  // ---------------- GET BY ID ----------------
  async getById(req, res) {
    try {
      const sheet = await TermTutorialSheetModel.getById(req.params.id);
      if (!sheet) return res.status(404).json({ success: false, message: "Sheet not found" });

      res.json({ success: true, data: sheet });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to fetch sheet" });
    }
  }

  // ---------------- GET BY COURSE & TERM ----------------
  async getByCourseAndTerm(req, res) {
    try {
      const { course_id, term_id } = req.params;
      const sheets = await TermTutorialSheetModel.getByCourseAndTerm(course_id, term_id);
      res.json({ success: true, data: sheets });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to fetch sheets" });
    }
  }

  // ---------------- GET ALL ----------------
  async getAll(req, res) {
    try {
      const sheets = await TermTutorialSheetModel.getAll();
      res.json({ success: true, data: sheets });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to fetch sheets" });
    }
  }

  // ---------------- PREVIEW ----------------
async previewDocument(req, res) {
  try {
    const sheet = await TermTutorialSheetModel.getById(req.params.id);
    if (!sheet?.file_url) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    const key = getKeyFromUrl(sheet.file_url);

    const url = await getSignedUrlFromR2(key, {
      disposition: "inline",
      filename: `${sheet.title || "tutorial_sheet"}.pdf`,
      expiresIn: 120,
    });

    res.json({ success: true, url });
  } catch (err) {
    console.error("Preview error:", err);
    res.status(500).json({ success: false, message: "Failed to preview file" });
  }
}


  // ---------------- DOWNLOAD (optional encrypted) ----------------
async download(req, res) {
  try {
    const sheet = await TermTutorialSheetModel.getById(req.params.id);
    if (!sheet?.file_url) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    const key = getKeyFromUrl(sheet.file_url);
    const safeTitle =
      (sheet.title || "tutorial_sheet").replace(/[^\w\d-_]+/g, "_") + ".pdf";

    const url = await getSignedUrlFromR2(key, {
      disposition: "attachment",
      filename: safeTitle,
      expiresIn: 120,
    });

    res.json({ success: true, url });
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ success: false, message: "Failed to download file" });
  }
}

}
