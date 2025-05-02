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
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT||3000}`;

/**
 * POST /
 * - Requires auth.
 * - Expects JSON body:
 *   { lat, lon, placements, availableWater, rootDepth, allowedDepletion,
 *     efficiency, vegetationType, nozzleType, soilType, exposure, slope,
 *     cropCoefficient, nozzleRate }
 */
router.post('/', auth, async (req, res) => {
  const {
    lat, lon, placements,
    availableWater, rootDepth, allowedDepletion,
    efficiency, vegetationType, nozzleType,
    soilType, exposure, slope,
    cropCoefficient, nozzleRate
  } = req.body;

  if (!lat || !lon) {
    return res.status(400).json({ error: "lat and lon are required" });
  }
  if (
    availableWater == null || rootDepth == null || allowedDepletion == null ||
    efficiency == null || !vegetationType || !nozzleType ||
    !soilType || !exposure || !slope
  ) {
    return res.status(400).json({ error: "All core system settings must be provided" });
  }

  // 1) Fetch weather, cache-busted
  let dailyWeatherSummaries = {};
  try {
    const weatherRes = await fetch(
      `${BASE_URL}/api/weather?lat=${lat}&lon=${lon}&cb=${Date.now()}`
    );
    const weatherJson = weatherRes.ok ? await weatherRes.json() : null;
    const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const start = new Date(); start.setDate(start.getDate()+1); start.setHours(0,0,0,0);

    for (let i=0; i<6; i++) {
      const d = new Date(start); d.setDate(start.getDate()+i);
      dailyWeatherSummaries[ dayNames[d.getDay()] ] = [];
    }

    if (weatherJson?.list) {
      weatherJson.list.forEach(f => {
        const dt = new Date(f.dt_txt);
        const day = dayNames[dt.getDay()];
        if (dt >= start && dt < new Date(start.getTime() + 6*24*60*60*1000)) {
          const h = dt.getHours();
          if ((h>=8&&h<10) || (h>=14&&h<16)) {
            dailyWeatherSummaries[day].push(
              `At ${h}:00, temp ${f.main.temp}°C, ${f.weather[0].description}`
            );
          }
        }
      });
    }
    for (const d in dailyWeatherSummaries) {
      const arr = dailyWeatherSummaries[d];
      dailyWeatherSummaries[d] = arr.length ? arr.join(" | ") : "No forecast available.";
    }
  } catch (err) {
    console.error("Weather fetch error:", err);
    dailyWeatherSummaries = { Error: "Weather data unavailable." };
  }

  // 2) Build prompt
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
${Object.entries(dailyWeatherSummaries).map(([d,s])=>`- ${d}: ${s}`).join("\n")}

Generate a 6-day watering schedule (starting tomorrow) in JSON with exactly two keys:
{
  "dailySchedule": { /* … */ },
  "summary": "Concise overall recommendations."
}
Only output valid JSON with exactly these two keys and no extra text.
`.trim();

  try {
    // 3) Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "o3-mini",
      messages: [
        { role: "system", content: "You are an expert in irrigation systems, water conservation, and agriculture." },
        { role: "user", content: prompt }
      ],
    });
    const aiRaw = completion.choices?.[0]?.message?.content;
    if (!aiRaw) throw new Error("No AI content");

    // 4) Parse
    let parsed;
    try { parsed = JSON.parse(aiRaw); }
    catch (pe) { console.error("JSON parse:", pe, aiRaw); throw new Error("Invalid JSON"); }

    // 5) Save & 6) Email
    await User.findByIdAndUpdate(req.user.id, {
      aiSchedule: parsed, aiScheduleGeneratedAt: new Date()
    });
    const user = await User.findById(req.user.id);
    if (user?.email) {
      await sendEmailNotification(
        user.email,
        "New AI Watering Schedule Generated",
        "Your new watering schedule is ready. Check your dashboard."
      );
    }

    // 7) Return
    return res.json({ aiSchedule: parsed });

  } catch (err) {
    console.error("AI schedule error:", err);
    return res.status(500).json({
      error: "Error generating AI schedule",
      details: err.message
    });
  }
});

/** GET /ai-saved (unchanged) **/
router.get('/ai-saved', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (
      !user?.aiSchedule ||
      !user.aiScheduleGeneratedAt ||
      (Date.now() - user.aiScheduleGeneratedAt.getTime() > 7*24*60*60*1000)
    ) return res.json({});
    return res.json({ aiSchedule: user.aiSchedule });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;