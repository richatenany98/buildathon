import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
  return jwt.verify(token, secret);
};

export const authenticateUser = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized - No token provided' });
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).select('_id email firstName lastName username');
    
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized - Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Unauthorized - Invalid token' });
  }
};

export default authenticateUser;

