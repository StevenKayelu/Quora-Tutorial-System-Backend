import {
  getContactInfo,
  getContactInfoById,
  createContactInfo,
  updateContactInfo,
  deleteContactInfo,
} from "../../models/ContactInfoModel.js";
import { uploadToR2, deleteFromR2, getKeyFromUrl } from "../../utils/r2Upload.js";
const safeJsonParse = (value, fallback = []) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

class ContactInfoController {
  async fetch(req, res) {
    try {
      const info = await getContactInfo();
      if (!info) return res.json({ success: true, data: null });

      info.social_links = Array.isArray(info.social_links)
        ? info.social_links
        : safeJsonParse(info.social_links || "[]", []);

      res.json({ success: true, data: info });
    } catch (err) {
      console.error("fetchContactInfo error:", err);
      res.status(500).json({ success: false, message: "Failed to load contact info" });
    }
  }

  async create(req, res) {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Access denied" });

    try {
      const data = { ...req.body };

      if (data.social_links && typeof data.social_links === "string") {
        data.social_links = safeJsonParse(data.social_links, []);
      }

      if (req.file) {
        data.contact_video_url = await uploadToR2({
          file: req.file,
          folder: "videos/contact",
        });
      }

      const id = await createContactInfo(data);
      res.status(201).json({ success: true, id });
    } catch (err) {
      console.error("createContactInfo error:", err);
      res.status(500).json({ success: false, message: "Failed to create contact info" });
    }
  }

  async update(req, res) {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Access denied" });

    try {
      const old = await getContactInfoById(req.params.id);
      if (!old) {
        return res.status(404).json({ success: false, message: "Contact info not found" });
      }
      const data = { ...req.body };

      if (data.social_links && typeof data.social_links === "string") {
        data.social_links = safeJsonParse(data.social_links, []);
      }

      if (req.file) {
        if (old.contact_video_url) {
          await deleteFromR2(getKeyFromUrl(old.contact_video_url));
        }

        data.contact_video_url = await uploadToR2({
          file: req.file,
          folder: "videos/contact",
        });
      }

      await updateContactInfo(old.id, data);

      res.json({ success: true });
    } catch (err) {
      console.error("updateContactInfo error:", err);
      res.status(500).json({ success: false, message: "Failed to update contact info" });
    }
  }

  async delete(req, res) {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false });

    try {
      const old = await getContactInfoById(req.params.id);
      if (!old) {
        return res.status(404).json({ success: false, message: "Contact info not found" });
      }

      if (old.contact_video_url) {
        await deleteFromR2(getKeyFromUrl(old.contact_video_url));
      }

      await deleteContactInfo(old.id);
      res.json({ success: true });
    } catch (err) {
      console.error("deleteContactInfo error:", err);
      res.status(500).json({ success: false, message: "Failed to delete contact info" });
    }
  }
}

export default new ContactInfoController();
