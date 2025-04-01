// models/Placement.js
import mongoose from 'mongoose';

const PlacementSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  row: { type: Number, required: true },
  col: { type: Number, required: true },
  type: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

export default mongoose.model('Placement', PlacementSchema);