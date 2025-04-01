// middleware/auth.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  console.log("Auth Middleware: Token received:", token);
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }
  try {
    // Debug: Log the JWT_SECRET in the auth middleware
    console.log("Auth Middleware: JWT_SECRET:", process.env.JWT_SECRET);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Auth Middleware: Decoded token:", decoded);
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error("Auth Middleware: Token verification error:", err);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

export default auth;