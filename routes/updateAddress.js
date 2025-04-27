// routes/updateAddress.js
import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Protected endpoint to update the user's address and map settings
router.put('/', auth, async (req, res) => {
  const { address, coords } = req.body;
  if (!address || !coords) {
    return res.status(400).json({ msg: "Address and coordinates are required" });
  }
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { address, "mapSettings.center": coords },
      { new: true }
    );
    res.json({ address: updatedUser.address, mapSettings: updatedUser.mapSettings });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

export default router;