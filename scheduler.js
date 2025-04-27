// scheduler.js
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import User from './models/User.js';
dotenv.config();

// Constants
const TWELVE_HOURS = 12 * 60 * 60 * 1000;  // 12 h in ms
const RAIN_THRESHOLD_MM = 5;               // significant rain-change threshold

// Create a nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send a “please update your schedule” email
async function sendScheduleStaleEmail(user) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: 'Your AI Watering Schedule Needs an Update',
    text: `Hello ${user.name},\n\n` +
          `Based on recent weather forecasts, your watering schedule is now out of date.\n` +
          `Please log in to your SprinklSmart dashboard and click “Generate AI Report” to refresh ` +
          `your schedule.\n\n` +
          `Thank you,\nSmart Sprinkler Team`
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) console.error("Error sending notification to", user.email, err);
    else console.log("Notified", user.email, "to update schedule:", info.response);
  });
}

// Check if forecast change warrants an email
async function updateAiScheduleForUser(user) {
  if (!user.mapSettings?.center) return;

  // 1) Fetch predicted rain total
  let totalRain = 0;
  try {
    const res = await fetch(
      `http://localhost:${process.env.PORT || 3000}` +
      `/api/schedule?lat=${user.mapSettings.center.lat}` +
      `&lon=${user.mapSettings.center.lng}`
    );
    if (!res.ok) {
      console.error("Schedule API error for", user.email);
      return;
    }
    const data = await res.json();
    totalRain = parseFloat(data.totalRain) || 0;
  } catch (err) {
    console.error("Error fetching schedule for", user.email, err);
    return;
  }

  const diff = Math.abs(totalRain - (user.lastRainForecast || 0));
  if (diff <= RAIN_THRESHOLD_MM) {
    // Change not significant
    return;
  }

  // 2) Throttle: only once per 12 hours
  const lastSent = user.lastWeatherEmailAt?.getTime() || 0;
  if (Date.now() - lastSent < TWELVE_HOURS) {
    console.log(
      `[${user.email}] Forecast changed by ${diff} mm but email throttled; ` +
      `${((Date.now() - lastSent) / 3600000).toFixed(1)}h since last notice.`
    );
    return;
  }

  // 3) Update user record with new forecast & timestamp
  user.lastRainForecast = totalRain;
  user.lastWeatherEmailAt = new Date();
  await user.save();

  // 4) Send notification email
  await sendScheduleStaleEmail(user);
}

// Cron job: run hourly
cron.schedule('0 * * * *', async () => {
  console.log("Hourly check for outdated watering schedules...");
  try {
    const users = await User.find({});
    for (const user of users) {
      await updateAiScheduleForUser(user);
    }
  } catch (err) {
    console.error("Scheduler error:", err);
  }
});

export default cron;
