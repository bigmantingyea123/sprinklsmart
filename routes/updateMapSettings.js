
import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    const mapSettings = user.mapSettings || { center: { lat: 40.7128, lng: -74.0060 }, zoom: 18 };
    res.json({ mapSettings });
  } catch (err) {
    console.error("Error fetching map settings:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.put('/', auth, async (req, res) => {
  const { center, zoom } = req.body;
  if (!center || typeof zoom !== 'number') {
    return res.status(400).json({ msg: "Both center and zoom are required" });
  }
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { "mapSettings.center": center, "mapSettings.zoom": zoom },
      { new: true }
    );
    res.json({ mapSettings: updatedUser.mapSettings });
  } catch (err) {
    console.error("Error updating map settings:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;