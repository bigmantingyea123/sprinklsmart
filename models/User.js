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
  date: { type: Date, default: Date.now },
});

export default mongoose.model('User', UserSchema);
