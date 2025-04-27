import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

try {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('MongoDB connected');
} catch (error) {
  console.error('MongoDB connection error:', error);
}

// Import routes
import authRoutes from './routes/auth.js';
import placementsRoutes from './routes/placements.js';
import weatherRoutes from './routes/weather.js';
import scheduleRoutes from './routes/schedule.js';
import aiScheduleRoutes from './routes/aiSchedule.js';
import updateAddressRoutes from './routes/updateAddress.js';
import updateMapSettingsRoutes from './routes/updateMapSettings.js';
import updateSettingsRoutes from './routes/updateSettings.js';
import googleAuthRoutes from './routes/authGoogle.js';
import getAiScheduleRoutes from './routes/getAiSchedule.js';

app.use('/api/auth', authRoutes);
app.use('/api/placements', placementsRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/ai-schedule', aiScheduleRoutes);
app.use('/api/ai-saved', getAiScheduleRoutes);
app.use('/api/update-address', updateAddressRoutes);
app.use('/api/map-settings', updateMapSettingsRoutes);
app.use('/api/settings', updateSettingsRoutes);
app.use('/api/auth', googleAuthRoutes);

app.get('/', (req, res) => {
  res.send('Hello, welcome to your Smart Sprinkler App!');
});

// Import scheduler if applicable
import './scheduler.js';

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});