// routes/aiSchedule.js
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai';
import fetch from 'node-fetch';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import { sendEmailNotification } from '../emailNotifications.js';

const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * GET /
 * - Requires auth.
 * - Expects query params: lat, lon, placements,
 *   plus the 11 system settings (optional if saved already)
 */
router.get('/', auth, async (req, res) => {
  const {
    lat,
    lon,
    placements,
    availableWater: qAvailableWater,
    rootDepth: qRootDepth,
    allowedDepletion: qAllowedDepletion,
    efficiency: qEfficiency,
    cropCoefficient: qCropCoefficient,
    nozzleRate: qNozzleRate,
    vegetationType: qVegetationType,
    nozzleType: qNozzleType,
    soilType: qSoilType,
    exposure: qExposure,
    slope: qSlope,
  } = req.query;

  // 1️⃣ Require only lat, lon & placements
  if (!lat || !lon || !placements) {
    return res
      .status(400)
      .json({ error: "lat, lon and placements query parameters are required" });
  }

  // 2️⃣ Load user and pull saved systemSettings as fallback
  const user = await User.findById(req.user.id);
  const ss = user.systemSettings || {};

  const availableWater   = qAvailableWater   || ss.availableWater;
  const rootDepth        = qRootDepth        || ss.rootDepth;
  const allowedDepletion = qAllowedDepletion || ss.allowedDepletion;
  const efficiency       = qEfficiency       || ss.efficiency;
  const cropCoefficient  = qCropCoefficient  || ss.cropCoefficient;
  const nozzleRate       = qNozzleRate       || ss.nozzleRate;
  const vegetationType   = qVegetationType   || ss.vegetationType;
  const nozzleType       = qNozzleType       || ss.nozzleType;
  const soilType         = qSoilType         || ss.soilType;
  const exposure         = qExposure         || ss.exposure;
  const slope            = qSlope            || ss.slope;

  // 3️⃣ If after fallback any core setting is still missing, error
  if (
    availableWater == null ||
    rootDepth == null ||
    allowedDepletion == null ||
    efficiency == null ||
    cropCoefficient == null ||
    nozzleRate == null ||
    !vegetationType ||
    !nozzleType ||
    !soilType ||
    !exposure ||
    slope == null
  ) {
    return res.status(400).json({
      error:
        "Missing system settings. Please visit your Settings page and save your system settings."
    });
  }

  // 4️⃣ Build 6-day weather summaries
  let dailyWeatherSummaries = {};
  try {
    const weatherRes = await fetch(
      `http://localhost:${process.env.PORT || 3000}` +
      `/api/weather?lat=${lat}&lon=${lon}`
    );
    const weatherJson = weatherRes.ok ? await weatherRes.json() : null;
    const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const start = new Date();
    start.setDate(start.getDate()+1);
    start.setHours(0,0,0,0);

    // Initialize next 6 days
    for (let i = 0; i < 6; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dailyWeatherSummaries[dayNames[d.getDay()]] = [];
    }

    if (weatherJson?.list) {
      weatherJson.list.forEach(f => {
        const dt = new Date(f.dt_txt);
        const dayName = dayNames[dt.getDay()];
        if (
          dt >= start &&
          dt < new Date(start.getTime() + 6*24*60*60*1000)
        ) {
          const h = dt.getHours();
          if ((h >= 8 && h < 10) || (h >= 14 && h < 16)) {
            dailyWeatherSummaries[dayName].push(
              `At ${h}:00, temp ${f.main.temp}°C, ${f.weather[0].description}`
            );
          }
        }
      });
    }

    // Convert arrays to summary strings
    for (const day in dailyWeatherSummaries) {
      const arr = dailyWeatherSummaries[day];
      dailyWeatherSummaries[day] = arr.length
        ? arr.join(" | ")
        : "No forecast available.";
    }
  } catch (err) {
    console.error("Weather fetch error:", err);
    dailyWeatherSummaries = { Error: "Weather data unavailable." };
  }

  // 5️⃣ Build the AI prompt
  const prompt = `
I manage a smart sprinkler system with:
- Lat/Lon: ${lat}, ${lon}

System Settings:
- Available Water: ${availableWater} in
- Root Depth: ${rootDepth} in
- Allowed Depletion: ${allowedDepletion}%
- Efficiency: ${efficiency}%
- Crop Coefficient: ${cropCoefficient}
- Nozzle Rate: ${nozzleRate} in/hr
- Vegetation: ${vegetationType}
- Nozzle: ${nozzleType}
- Soil: ${soilType}
- Exposure: ${exposure}
- Slope: ${slope}

Placements (grid):
- ${placements}

Weather for next 6 days:
${Object.entries(dailyWeatherSummaries)
   .map(([d, s]) => `- ${d}: ${s}`)
   .join("\n")}

Generate a 6-day watering schedule (starting tomorrow) in JSON with exactly two keys:
{
  "dailySchedule": {
    "DayName": [
      { "zone": "Zone 1", "startTime": "8:00 AM", "duration": "15 minutes", "action": "water sprinkler" }
    ],
    // ...
  },
  "summary": "Concise overall recommendations."
}
Only output valid JSON with exactly these two keys and no extra text.
`.trim();

  try {
    // 6️⃣ Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "o3-mini",
      messages: [
        { role: "system", content: "You are an expert in irrigation systems, water conservation, and agriculture." },
        { role: "user", content: prompt }
      ],
    });

    const aiRaw = completion.choices?.[0]?.message?.content;
    if (!aiRaw) throw new Error("No AI content returned");

    // 7️⃣ Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(aiRaw);
    } catch (pe) {
      console.error("AI JSON parse error:", pe, aiRaw);
      throw new Error("AI response is not valid JSON");
    }

    // 8️⃣ Save it to the user record
    await User.findByIdAndUpdate(req.user.id, {
      aiSchedule: parsed,
      aiScheduleGeneratedAt: new Date()
    });

    // 9️⃣ Email notification
    if (user.email) {
      await sendEmailNotification(
        user.email,
        "New AI Watering Schedule Generated",
        "Your new watering schedule is ready. Check your dashboard for details."
      );
    }

    // 🔟 Return the schedule
    return res.json({ aiSchedule: parsed });

  } catch (err) {
    console.error("AI schedule error:", err);
    return res.status(500).json({
      error: "Error generating AI schedule",
      details: err.message
    });
  }
});

/**
 * GET /ai-saved
 * - Requires auth.
 * - Returns the saved aiSchedule if it exists and was generated within the last 7 days.
 */
router.get('/ai-saved', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (
    !user?.aiSchedule ||
    !user.aiScheduleGeneratedAt ||
    (Date.now() - user.aiScheduleGeneratedAt.getTime()) > 7 * 24 * 60 * 60 * 1000
  ) {
    return res.json({}); // none or expired
  }
  return res.json({ aiSchedule: user.aiSchedule });
});

export default router;