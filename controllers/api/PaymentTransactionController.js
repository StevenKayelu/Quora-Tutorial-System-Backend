// controllers/PaymentTransactionController.js
import PaymentTransactionModel from "../../models/PaymentTransactionModel.js";

export default class PaymentTransactionController {

  static async getAll(req, res) {
    try {
        if (req.user.role !== "admin")
        return res.status(403).json({ success: false, message: "Access denied" });

      const transactions = await PaymentTransactionModel.getAll();

      res.json(transactions);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch transactions", error: err.message });
    }
  }

  static async getDetails(req, res) {
  try {
    if (req.user.role !== "admin")
        return res.status(403).json({ success: false, message: "Access denied" });

    const { id } = req.params;

    const transaction = await PaymentTransactionModel.getById(id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const courses = await PaymentTransactionModel.getCoursesByTransaction(
      transaction.transaction_id   // ✅ STRING
    );

    res.json({ transaction, courses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch transaction details" });
  }
}
static async delete(req, res) {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const { id } = req.params;

    const result = await PaymentTransactionModel.deleteById(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      message: result.message
    });

  } catch (err) {
    console.error("Delete transaction error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete transaction"
    });
  }
}
}
