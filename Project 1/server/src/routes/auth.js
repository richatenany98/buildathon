import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = Router();

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    // 7 days
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
};

const signToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
  return jwt.sign({ sub: userId }, secret, { expiresIn: '7d' });
};

const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
  return jwt.verify(token, secret);
};

router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, username, email, password } = req.body;
    if (!firstName || !lastName || !username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({ message: 'Username already in use' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({ firstName, lastName, username, email, passwordHash });

    const token = signToken(user._id.toString());
    res.cookie('token', token, getCookieOptions());

    res.status(201).json({ id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, username: user.username });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user._id.toString());
    res.cookie('token', token, getCookieOptions());

    res.json({ id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, username: user.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/logout', async (_req, res) => {
  try {
    res.clearCookie('token', { ...getCookieOptions(), maxAge: 0 });
    res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).select('_id email firstName lastName username');
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    res.json({ id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, username: user.username });
  } catch (_err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
});

export default router;


