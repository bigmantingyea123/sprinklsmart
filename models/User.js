// models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  address: { type: String },
  mapSettings: {
    center: {
      lat: { type: Number, default: 40.7128 },
      lng: { type: Number, default: -74.0060 },
    },
    zoom: { type: Number, default: 18 },
  },
  systemSettings: {
    availableWater: { type: String, default: "0" },
    rootDepth: { type: String, default: "0" },
    allowedDepletion: { type: String, default: "0" },
    efficiency: { type: String, default: "0" },
    cropCoefficient: { type: String, default: "0" },
    nozzleRate: { type: String, default: "0" },
    vegetationType: { type: String, default: "0" },
    nozzleType: { type: String, default: "0" },
    soilType: { type: String, default: "0" },
    exposure: { type: String, default: "0" },
    slope: { type: String, default: "0" }
  },
  // Persisted AI schedule JSON
  aiSchedule: { type: Object, default: null },
  aiScheduleGeneratedAt: { type: Date },
  lastRainForecast: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
});

export default mongoose.model('User', UserSchema);
