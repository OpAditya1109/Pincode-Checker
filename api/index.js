import axios from "axios";

const zoneDays = {
  A: 2,
  B: 3,
  C: 4,
  D: 5,
  E: 6,
  F: 7
};

export default async function handler(req, res) {

  const { pincode } = req.query;

  /* Health check */
  if (!pincode) {
    return res.status(200).json({
      status: "Delivery API running",
      usage: "/api/check-delivery?pincode=400001"
    });
  }

  if (!/^\d{6}$/.test(pincode)) {
    return res.status(400).json({
      error: "Invalid pincode"
    });
  }

  try {

    const response = await axios.get(
      "https://track.delhivery.com/api/kinko/v1/invoice/charges/.json",
      {
        params: {
          md: "S",
          ss: "Delivered",
          d_pin: pincode,
          o_pin: process.env.ORIGIN_PIN,
          cgm: 500
        },
        headers: {
          Authorization: `Token ${process.env.DELHIVERY_TOKEN}`
        }
      }
    );

    const zone = response?.data?.[0]?.zone;

    if (!zone) {
      return res.status(404).json({
        error: "Delivery not available"
      });
    }

    const baseZone = zone.charAt(0);
    const deliveryDays = zoneDays[baseZone] || 6;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + deliveryDays);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + deliveryDays + 1);

    return res.status(200).json({
      success: true,
      pincode,
      zone,
      delivery_days: deliveryDays,
      delivery_start: startDate.toDateString(),
      delivery_end: endDate.toDateString()
    });

  } catch (error) {

    console.error("Delhivery Error:", error.response?.data || error.message);

    return res.status(500).json({
      error: "Unable to check delivery"
    });
  }
}