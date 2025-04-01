
import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

router.get('/', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "lat and lon query parameters are required" });
  }
  try {
    const apiKey = process.env.OPENWEATHERMAP_API_KEY;
    const weatherResponse = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    );
    const forecasts = weatherResponse.data.list;
    
    let totalRain = 0;
    forecasts.forEach(forecast => {
      if (forecast.rain && forecast.rain["3h"]) {
        totalRain += forecast.rain["3h"];
      }
    });

    let schedule;
    if (totalRain > 20) {
      schedule = "No extra watering needed this week due to sufficient rain.";
    } else {
      schedule = "Schedule watering: 15 minutes per zone daily.";
    }
    
    res.json({ schedule, totalRain });
  } catch (err) {
    console.error("Error details:", err.response ? err.response.data : err.message);
    res.status(500).json({ error: "Error calculating watering schedule" });
  }
});

export default router;