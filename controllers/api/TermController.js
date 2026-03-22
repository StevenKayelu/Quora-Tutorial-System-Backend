import TermModel from "../../models/TermModel.js";
import db from "../../config/db.js";

export default class TermController {

  // =====================================
  // GET ALL TERMS
  // =====================================
  async getAll(req, res) {
    try {
      const terms = await TermModel.getAll();
      res.status(200).json({ success: true, data: terms });
    } catch (err) {
      console.error("Error loading terms:", err);
      res.status(500).json({ success: false, message: "Failed to load terms" });
    }
  }

  // =====================================
  // GET TERM BY ID
  // =====================================
  async getById(req, res) {
    try {
      const term = await TermModel.getById(req.params.id);
      if (!term) {
        return res.status(404).json({
          success: false,
          message: "Term not found"
        });
      }

      res.status(200).json({ success: true, data: term });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: "Error fetching term"
      });
    }
  }

  // =====================================
  // CREATE TERM
  // =====================================
  async create(req, res) {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      const { term_number, start_date, end_date } = req.body;

      if (![1, 2, 3].includes(Number(term_number))) {
        return res.status(400).json({
          success: false,
          message: "Term number must be 1, 2, or 3"
        });
      }

      const id = await TermModel.create({
        term_number,
        start_date,
        end_date
      });

      res.status(201).json({
        success: true,
        message: "Term created",
        id
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: "Error creating term"
      });
    }
  }

  // =====================================
  // UPDATE TERM + SYNC SUBSCRIPTIONS 🔥
  // =====================================
  async update(req, res) {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      const { term_number, start_date, end_date } = req.body;
      const termId = req.params.id;

      if (![1, 2, 3].includes(Number(term_number))) {
        return res.status(400).json({
          success: false,
          message: "Term number must be 1, 2, or 3"
        });
      }

      // 🔒 Use transaction for consistency
      const connection = await db.getConnection();

      try {
        await connection.beginTransaction();

        // 1️⃣ Update term
        await TermModel.update(termId, {
          term_number,
          start_date,
          end_date
        }, connection);

        // 2️⃣ Sync all subscriptions expiry
        const [result] = await connection.query(`
          UPDATE user_course_subscription
          SET expires_at = ?
          WHERE term_id = ?
        `, [end_date, termId]);

        await connection.commit();

        res.json({
          success: true,
          message: `Term updated. ${result.affectedRows} subscriptions synced`
        });

      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }

    } catch (err) {
      console.error("Error updating term:", err);
      res.status(500).json({
        success: false,
        message: "Error updating term"
      });
    }
  }

  // =====================================
  // DELETE TERM
  // =====================================
  async delete(req, res) {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      const termId = req.params.id;

      // Optional: prevent delete if in use
      const [rows] = await db.query(`
        SELECT COUNT(*) as count
        FROM user_course_subscription
        WHERE term_id = ?
      `, [termId]);

      if (rows[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete term with active subscriptions"
        });
      }

      await TermModel.delete(termId);

      res.json({
        success: true,
        message: "Term deleted"
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: "Error deleting term"
      });
    }
  }
}
