// server.js
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
// allow all origins — adjust in production if you need to lock this down
app.use(cors());

// connect to MongoDB
try {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');
} catch (err) {
  console.error('MongoDB connection error:', err);
  process.exit(1);
}

// your route imports
import authRoutes       from './routes/auth.js';
import placementsRoutes from './routes/placements.js';
import weatherRoutes    from './routes/weather.js';
import scheduleRoutes   from './routes/schedule.js';
import aiScheduleRoutes from './routes/aiSchedule.js';
import updateAddress    from './routes/updateAddress.js';
import mapSettings      from './routes/updateMapSettings.js';
import settingsRoutes   from './routes/updateSettings.js';

// mount only the ones you have on disk
app.use('/api/auth',        authRoutes);
app.use('/api/placements',  placementsRoutes);
app.use('/api/weather',     weatherRoutes);
app.use('/api/schedule',    scheduleRoutes);
app.use('/api/ai-schedule', aiScheduleRoutes);
app.use('/api/update-address',  updateAddress);
app.use('/api/map-settings',    mapSettings);
app.use('/api/settings',        settingsRoutes);

app.get('/', (req, res) => res.send('Hello, Sprinkler API is up!'));

// if you have a scheduler file
import './scheduler.js';

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});