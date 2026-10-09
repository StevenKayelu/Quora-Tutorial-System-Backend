import db from "../../config/db.js";
import moneyUnifyService from "../../services/moneyUnifyService.js";
import PaymentModel from "../../models/PaymentModel.js";

class PaymentController {

  // -------------------- INITIATE PAYMENT --------------------
  async initiatePayment(req, res) {
    try {
      // Never trust the client for who is paying or how much: the payer comes
      // from the verified token and the amount is priced from the DB.
      const user_id = req.user.id;
      const { course_id, phone } = req.body;
      const currency = "ZMW";

      if (!user_id || !course_id || !phone) {
        return res.status(400).json({
          success: false,
          message: "Missing required payment fields"
        });
      }

      const courses = [
        ...new Set((Array.isArray(course_id) ? course_id : [course_id]).map(Number)),
      ];

      if (!courses.length || courses.some((id) => !Number.isInteger(id) || id <= 0)) {
        return res.status(400).json({ success: false, message: "Invalid course selection" });
      }

      const [courseRows] = await db.query(
        `SELECT id, amount FROM courses WHERE id IN (?)`,
        [courses]
      );

      if (courseRows.length !== courses.length) {
        return res.status(400).json({ success: false, message: "One or more courses do not exist" });
      }

      const amount = courseRows.reduce((sum, c) => sum + Number(c.amount || 0), 0);

      if (!(amount > 0)) {
        return res.status(400).json({ success: false, message: "Selected courses have no price set" });
      }

      // 1️⃣ Get active gateway
      const [gatewayRow] = await db.query(
        `SELECT id FROM payment_gateway 
         WHERE gateway_name=? AND is_active=1 
         LIMIT 1`,
        ["moneyunify"]
      );

      if (!gatewayRow.length) {
        return res.status(400).json({
          success: false,
          message: "Payment gateway not configured"
        });
      }

      const gateway_id = gatewayRow[0].id;

      // 2️⃣ REQUEST payment from MoneyUnify (🔥 THIS WAS MISSING)
      const response = await moneyUnifyService.requestPayment(phone, amount);

      const providerTid = response?.data?.transaction_id;

      if (!providerTid) {
        return res.status(500).json({
          success: false,
          message: "Failed to initiate payment with provider",
          raw: response
        });
      }

      // 3️⃣ Save transaction using REQUEST transaction_id
      await PaymentModel.createTransaction({
        user_id,
        courses,
        amount,
        currency,
        payment_method: "moneyunify",
        gateway_id,
        transaction_id: providerTid, // ✅ sPX...
        response_data: response
      });

      // 4️⃣ RETURN REFERENCE (frontend depends on this)
      return res.json({
        success: true,
        message: "Payment initiated. Approve on your phone.",
        reference: providerTid,                 // ✅ REQUIRED
        provider_transaction_id: providerTid,   // backward compatible
        status: "pending"
      });

    } catch (error) {
      console.error("Payment Initiation Error:", error);

      return res.status(500).json({
        success: false,
        message: "Payment initiation failed"
      });
    }
  }

  // -------------------- VERIFY PAYMENT --------------------
  async verifyPayment(req, res) {
    try {
      const { transaction_id } = req.body;

      if (!transaction_id) {
        return res.json({
          success: false,
          status: "failed",
          message: "Missing transaction_id"
        });
      }

      // 1️⃣ Fetch local transaction
      const tx = await PaymentModel.getByTransaction(transaction_id);
      if (!tx || (req.user.role !== "admin" && Number(tx.user_id) !== Number(req.user.id))) {
        return res.json({
          success: false,
          status: "failed",
          message: "Transaction not found"
        });
      }

      // 2️⃣ Already finalized
      if (tx.payment_status === "success") {
        return res.json({
          success: true,
          status: "success",
          message: "Payment already completed"
        });
      }

      if (tx.payment_status === "failed") {
        return res.json({
          success: false,
          status: "failed",
          message: "Payment already failed"
        });
      }

      // 3️⃣ Verify with MoneyUnify
      const result = await moneyUnifyService.verifyPayment(transaction_id);

      if (!result || result.isError || !result.data?.status) {
        return res.json({
          success: true,
          status: "pending",
          message: "Payment still processing"
        });
      }

      // 4️⃣ SUCCESS
     const providerStatus = result.data.status.toLowerCase();

      if (providerStatus === "successful") {
        await PaymentModel.finalizeTransaction(
          transaction_id,                 // 🔑 REQUEST ID (DB lookup key)
          "success",
          result.data.transaction_id       // 🔑 PROVIDER ID (receipt)
        );

        return res.json({
          success: true,
          status: "success",
          message: "Payment successful"
        });
      }


      // 5️⃣ FAILED
      if (providerStatus === "failed") {
        await PaymentModel.finalizeTransaction(transaction_id, "failed");

        return res.json({
          success: false,
          status: "failed",
          message: "Payment failed"
        });
      }

      // 6️⃣ Still pending
      return res.json({
        success: true,
        status: "pending",
        message: "Awaiting confirmation"
      });

    } catch (error) {
      console.error("Verify Payment Fatal Error:", error);

      // ❗ Never break frontend polling
      return res.json({
        success: true,
        status: "pending",
        message: "Verification delayed"
      });
    }
  }
}

export default new PaymentController();
