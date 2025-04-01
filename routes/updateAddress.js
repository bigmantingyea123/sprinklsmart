// routes/updateAddress.js
import express from 'express';
import dotenv from 'dotenv';
import auth from '../middleware/auth.js';
import User from '../models/User.js';

dotenv.config();

const router = express.Router();

router.put('/', auth, async (req, res) => {
  const { address } = req.body;
  if (!address) {
    return res.status(400).json({ msg: "Address is required" });
  }
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { address },
      { new: true }
    );
    res.json({ address: user.address });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

export default router;