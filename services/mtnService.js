import axios from "axios";
import crypto from "crypto";

const mtnService = {
  async getToken() {
    const response = await axios.post(
      "https://sandbox.momodeveloper.mtn.com/v1/oauth/authenticate",
      {},
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.MTN_PRIMARY_KEY
        }
      }
    );

    return response.data.access_token;
  },

  async pushPayment(phone, amount, reference) {
    const token = await this.getToken();

    await axios.post(
      "https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay",
      {
        amount,
        currency: "ZMW",
        externalId: reference,
        payer: {
          partyIdType: "MSISDN",
          partyId: phone
        },
        payerMessage: "Course Subscription",
        payeeNote: reference
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Reference-Id": reference,
          "X-Target-Environment": "sandbox",
          "Ocp-Apim-Subscription-Key": process.env.MTN_PRIMARY_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    return { message: "MTN push sent" };
  }
};

export default mtnService;
