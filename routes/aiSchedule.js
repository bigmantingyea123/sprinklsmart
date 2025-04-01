// routes/aiSchedule.js
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import OpenAI from 'openai';

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.get('/', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "lat and lon query parameters are required" });
  }

  
  const sampleWeatherData = "Forecast: moderate rain expected with a total of 15mm over the next 5 days.";
  const samplePlacementData = "Sprinkler placements at grid positions (2,3), (5,7), and (8,1).";
  const sampleSoilData = "Soil hydration is at 60% on average.";

  const prompt = `
I manage a smart sprinkler system with the following data:
- Weather data: ${sampleWeatherData}
- Sprinkler placements: ${samplePlacementData}
- Soil hydration: ${sampleSoilData}
- Additional context: There are trees, garden plants, and lawn areas, each with different water requirements.

Based on this information, please recommend a detailed watering schedule for the upcoming week that optimizes water usage while ensuring that all areas receive the appropriate amount of water. Provide specific times and durations for each sprinkler zone.
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are an expert in irrigation systems and water conservation." },
        { role: "user", content: prompt }
      ],
    });
    const aiResponse = completion.choices[0].message.content;
    res.json({ aiSchedule: aiResponse });
  } catch (err) {
    console.error("Error calling OpenAI API:", err);
    res.status(500).json({ error: "Error generating AI schedule" });
  }
});

export default router;
