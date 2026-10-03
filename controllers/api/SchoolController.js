import SchoolModel from "../../models/SchoolModel.js";

export default class SchoolController {
  async getAll(req, res) {
    try {
      const { role } = req.user; // from middleware
      const schools = await SchoolModel.getAll();
      return res.status(200).json({ success: true, data: schools });
    } catch (error) {
      console.error("getAll schools:", error);
      res.status(500).json({ success: false, message: "Failed to load schools." });
    }
  }

  async getById(req, res) {
    try {
      const school = await SchoolModel.getById(req.params.id);
      if (!school) return res.status(404).json({ success: false, message: "School not found" });
      return res.status(200).json({ success: true, data: school });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching school" });
    }
  }

  async create(req, res) {
    try {
      if (req.user.role !== "admin")
        return res.status(403).json({ success: false, message: "Access denied" });

      const id = await SchoolModel.create(req.body);
      res.status(201).json({ success: true, message: "School added", id });
    } catch (error) {
      console.error("Error creating school:", error);
      res.status(500).json({ success: false, message: "Error creating school" });
    }
  }

  async update(req, res) {
    try {
      if (req.user.role !== 'admin')
        return res.status(403).json({ success: false, message: "Access denied" });

      await SchoolModel.update(req.params.id, req.body);
      res.json({ success: true, message: "School updated" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error updating school" });
    }
  }

  async delete(req, res) {
    try {
      if (req.user.role !== 'admin')
        return res.status(403).json({ success: false, message: "Access denied" });

      await SchoolModel.delete(req.params.id);
      res.json({ success: true, message: "School deleted" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error deleting school" });
    }
  }
}
