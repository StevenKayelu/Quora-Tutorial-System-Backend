import axios from "axios";

const zamtelService = {
  async pushPayment(phone, amount, reference) {
    const res = await axios.post(
      "https://api.zamtel.co.zm/kwacha/collect",
      {
        mobile: phone,
        amount,
        reference
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ZAMTEL_TOKEN}`
        }
      }
    );

    return res.data;
  }
};

export default zamtelService;
