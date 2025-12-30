import TermModel from "../../models/TermModel.js";

export default class TermController {
  async getAll(req, res) {
    try {
      const terms = await TermModel.getAll();
      res.status(200).json({ success: true, data: terms });
    } catch (err) {
      console.error("Error loading terms:", err);
      res.status(500).json({ success: false, message: "Failed to load terms" });
    }
  }

  async getById(req, res) {
    try {
      const term = await TermModel.getById(req.params.id);
      if (!term) return res.status(404).json({ success: false, message: "Term not found" });
      res.status(200).json({ success: true, data: term });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error fetching term" });
    }
  }

  async create(req, res) {
    try {
      if (req.user.role !== "admin")
        return res.status(403).json({ success: false, message: "Access denied" });

      const { term_number, start_date, end_date } = req.body;

      if (![1, 2, 3].includes(Number(term_number))) {
        return res.status(400).json({ success: false, message: "Term number must be 1, 2, or 3" });
      }

      const id = await TermModel.create({ term_number, start_date, end_date });
      res.status(201).json({ success: true, message: "Term created", id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error creating term" });
    }
  }

  async update(req, res) {
    try {
      if (req.user.role !== "admin")
        return res.status(403).json({ success: false, message: "Access denied" });

      const { term_number, start_date, end_date } = req.body;

      if (![1, 2, 3].includes(Number(term_number))) {
        return res.status(400).json({ success: false, message: "Term number must be 1, 2, or 3" });
      }

      await TermModel.update(req.params.id, { term_number, start_date, end_date });
      res.json({ success: true, message: "Term updated" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error updating term" });
    }
  }

  async delete(req, res) {
    try {
      if (req.user.role !== "admin")
        return res.status(403).json({ success: false, message: "Access denied" });

      await TermModel.delete(req.params.id);
      res.json({ success: true, message: "Term deleted" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error deleting term" });
    }
  }
}
