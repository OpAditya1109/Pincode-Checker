import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();

/* ---------------- SECURITY ---------------- */

app.use(helmet());

/* ---------------- RATE LIMIT ---------------- */

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    error: "Too many requests, please try again later."
  }
});

app.use(limiter);

/* ---------------- CORS ---------------- */

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "*",
    methods: ["GET"],
    allowedHeaders: ["Content-Type"]
  })
);

/* ---------------- ENV VARIABLES ---------------- */

const DELHIVERY_TOKEN = process.env.DELHIVERY_TOKEN;
const ORIGIN_PIN = process.env.ORIGIN_PIN;

/* ---------------- DELIVERY ZONE LOGIC ---------------- */

const zoneDays = {
  A: 2,
  B: 3,
  C: 4,
  D: 5,
  E: 6,
  F: 7
};

/* ---------------- HEALTH CHECK ---------------- */

app.get("/", (req, res) => {
  res.json({
    status: "Delivery API running"
  });
});

/* ---------------- DELIVERY API ---------------- */

app.get("/check-delivery/:pincode", async (req, res) => {

  const pincode = req.params.pincode;

  if (!pincode || !/^\d{6}$/.test(pincode)) {
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
          o_pin: ORIGIN_PIN,
          cgm: 500
        },
        headers: {
          Authorization: `Token ${DELHIVERY_TOKEN}`
        }
      }
    );

    const zone = response.data?.[0]?.zone;

    if (!zone) {
      return res.status(404).json({
        error: "Delivery not available"
      });
    }

    /* Extract base zone (D1 → D) */

    const baseZone = zone.charAt(0);

    const deliveryDays = zoneDays[baseZone] || 6;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + deliveryDays);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + deliveryDays + 1);

    res.json({
      success: true,
      pincode,
      zone,
      delivery_days: deliveryDays,
      delivery_start: startDate.toDateString(),
      delivery_end: endDate.toDateString()
    });

  } catch (error) {

    console.error("Delhivery API Error:", error.response?.data || error.message);

    res.status(500).json({
      error: "Unable to check delivery"
    });
  }

});

/* ---------------- START SERVER ---------------- */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Delivery API running on port ${PORT}`);
});