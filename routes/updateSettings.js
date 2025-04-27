import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ systemSettings: user.systemSettings });
  } catch (error) {
    console.error("Error fetching system settings:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});
router.put('/', auth, async (req, res) => {
  const {
    availableWater,
    rootDepth,
    allowedDepletion,
    efficiency,
    cropCoefficient,
    nozzleRate,
    vegetationType,
    nozzleType,
    soilType,
    exposure,
    slope
  } = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        systemSettings: {
          availableWater,
          rootDepth,
          allowedDepletion,
          efficiency,
          cropCoefficient,
          nozzleRate,
          vegetationType,
          nozzleType,
          soilType,
          exposure,
          slope
        }
      },
      { new: true }
    );
    res.json({ systemSettings: updatedUser.systemSettings });
  } catch (error) {
    console.error("Error updating system settings:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;