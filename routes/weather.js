// routes/weather.js
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
    res.json(weatherResponse.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error fetching weather data" });
  }
});

export default router;