import db from "../../config/db.js";
import moneyUnifyService from "../../services/moneyUnifyService.js";
import PaymentModel from "../../models/PaymentModel.js";

class PaymentController {

  // -------------------- INITIATE PAYMENT --------------------
  async initiatePayment(req, res) {
    try {
      const { user_id, course_id, amount, currency, phone } = req.body;

      if (!user_id || !course_id || !amount || !phone) {
        return res.status(400).json({
          success: false,
          message: "Missing required payment fields"
        });
      }

      const courses = Array.isArray(course_id) ? course_id : [course_id];

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
      if (!tx) {
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
