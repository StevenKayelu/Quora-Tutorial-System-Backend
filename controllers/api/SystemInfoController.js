import {
  getSystemInfo,
  createSystemInfo,
  updateSystemInfo,
  deleteSystemInfo,
  getSystemInfoById,
} from "../../models/SystemInfoModel.js";
import { uploadImageToR2, deleteFromR2, getKeyFromUrl } from "../../utils/r2Upload.js";

class SystemInfoController {
  // Fetch latest system info
  async fetchSystemInfo(req, res) {
    try {
      const info = await getSystemInfo();
      if (!info)
        return res.status(404).json({ success: false, message: "System info not found" });

      info.coursera_images = JSON.parse(info.coursera_images || "[]");
      res.json({ success: true, data: info });
    } catch (error) {
      console.error("fetchSystemInfo error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // Create new system info
  async create(req, res) {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Access denied" });

    try {
      let {
        system_name,
        about_us,
        terms_and_conditions,
        privacy_policy,
        existing_coursera_images,
      } = req.body;

      // Parse existing URLs
      let coursera_images = [];
      if (existing_coursera_images) {
        try {
          coursera_images = JSON.parse(existing_coursera_images);
        } catch {}
      }

      // Upload files to R2
      if (req.files?.logo?.[0]) {
        req.body.logo = await uploadImageToR2(req.files.logo[0], "system-info/logo");
      }
      if (req.files?.favicon?.[0]) {
        req.body.favicon = await uploadImageToR2(req.files.favicon[0], "system-info/favicon");
      }
      if (req.files?.coursera_images?.length) {
        for (const file of req.files.coursera_images) {
          const url = await uploadImageToR2(file, "system-info/coursera");
          coursera_images.push(url);
        }
      }

      // Save to DB
      const id = await createSystemInfo({
        system_name,
        logo: req.body.logo || null,
        favicon: req.body.favicon || null,
        coursera_images,
        about_us,
        terms_and_conditions,
        privacy_policy,
      });

      res.status(201).json({ success: true, message: "System info created", id });
    } catch (error) {
      console.error("createSystemInfo error:", error);
      res.status(500).json({ success: false, message: "Failed to create system info" });
    }
  }

  // Update existing system info
  async update(req, res) {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false });

    try {
      const id = req.params.id;
      const existing = await getSystemInfoById(id);
      if (!existing)
        return res.status(404).json({ success: false, message: "Not found" });

      let {
        system_name,
        about_us,
        terms_and_conditions,
        privacy_policy,
      } = req.body;

      // Start with existing values
      let logo = existing.logo;
      let favicon = existing.favicon;
      let coursera_images = JSON.parse(existing.coursera_images || "[]");

      // Upload new logo
      if (req.files?.logo?.[0]) {
        if (existing.logo) await deleteFromR2(getKeyFromUrl(existing.logo));
        logo = await uploadImageToR2(req.files.logo[0], "system-info/logo");
      }

      // Upload new favicon
      if (req.files?.favicon?.[0]) {
        if (existing.favicon) await deleteFromR2(getKeyFromUrl(existing.favicon));
        favicon = await uploadImageToR2(req.files.favicon[0], "system-info/favicon");
      }

      // Upload new coursera images (append to existing)
      if (req.files?.coursera_images?.length) {
        for (const file of req.files.coursera_images) {
          const url = await uploadImageToR2(file, "system-info/coursera");
          coursera_images.push(url);
        }
      }

      // Update DB
      await updateSystemInfo(id, {
        system_name,
        logo,
        favicon,
        coursera_images, // always array
        about_us,
        terms_and_conditions,
        privacy_policy,
      });

      res.json({ success: true, message: "System info updated" });
    } catch (error) {
      console.error("updateSystemInfo error:", error);
      res.status(500).json({ success: false, message: "Update failed" });
    }
  }

  // Delete system info
  async delete(req, res) {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Access denied" });

    try {
      const { id } = req.params;
      const existing = await getSystemInfoById(id);
      if (!existing)
        return res.status(404).json({ success: false, message: "Record not found" });

      // Delete R2 files
      if (existing.logo) await deleteFromR2(getKeyFromUrl(existing.logo));
      if (existing.favicon) await deleteFromR2(getKeyFromUrl(existing.favicon));

      const images = JSON.parse(existing.coursera_images || "[]");
      for (const img of images) await deleteFromR2(getKeyFromUrl(img));

      await deleteSystemInfo(id);
      res.json({ success: true, message: "System info deleted" });
    } catch (error) {
      console.error("deleteSystemInfo error:", error);
      res.status(500).json({ success: false, message: "Deletion failed" });
    }
  }
}

export default new SystemInfoController();
