import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ aiSchedule: user.aiSchedule });
  } catch (error) {
    console.error("Error fetching saved AI schedule:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;