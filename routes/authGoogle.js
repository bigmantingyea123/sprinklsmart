// routes/authGoogle.js
import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "Google token is required" });
  }
  try {
   
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ name, email, password: payload.sub, address: "" });
      await user.save();
    }

    const jwtPayload = { user: { id: user.id } };
    jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: 360000 }, (err, jwtToken) => {
      if (err) throw err;
      res.json({ token: jwtToken });
    });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({ error: "Google authentication failed" });
  }
});

export default router;