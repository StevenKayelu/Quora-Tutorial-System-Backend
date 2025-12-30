import axios from "axios";

const airtelService = {
  async pushPayment(phone, amount, reference) {
    const response = await axios.post(
      "https://openapi.airtel.africa/merchant/v1/payments",
      {
        reference,
        subscriber: {
          country: "ZM",
          currency: "ZMW",
          msisdn: phone
        },
        transaction: {
          amount,
          country: "ZM",
          currency: "ZMW",
          id: reference
        }
      },
      {
        headers: {
          "X-Client-Id": process.env.AIRTEL_CLIENT_ID,
          "X-Client-Secret": process.env.AIRTEL_SECRET
        }
      }
    );

    return response.data;
  }
};

export default airtelService;
