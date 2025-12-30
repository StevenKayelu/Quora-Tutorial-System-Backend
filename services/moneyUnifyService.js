import axios from "axios";
import qs from "qs";

const AUTH_ID = "01KADM4SXXDQYF3ACG2YKAR6FE";

class MoneyUnifyService {
  async requestPayment(phone, amount) {
    const body = qs.stringify({ from_payer: phone, amount, auth_id: AUTH_ID });

    try {
      const res = await axios.post(
        "https://api.moneyunify.one/payments/request",
        body,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15000 }
      );
      return res.data;
    } catch (err) {
      console.error("MoneyUnify Request Error:", err.response?.data || err);
      return { success: false, error: err.response?.data };
    }
  }

  async verifyPayment(transactionId) {
    const body = qs.stringify({ transaction_id: transactionId, auth_id: AUTH_ID });

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await axios.post(
          "https://api.moneyunify.one/payments/verify",
          body,
          { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 20000 }
        );
        return res.data;
      } catch (err) {
        console.warn(`Verify attempt ${attempt} failed:`, err.message || err);
        if (attempt === 3) return { success: false, error: err.response?.data };
      }
    }
  }
}

export default new MoneyUnifyService();
