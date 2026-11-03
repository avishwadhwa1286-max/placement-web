import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import StudentProfile from '../models/StudentProfile.js';
import { protect } from '../middleware/auth.js';

const router = Router();
const tokenFor = user => jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = async user => {
  const data = user.toObject(); delete data.password;
  if (user.role === 'student') data.profile = await StudentProfile.findOne({ userId: user._id });
  if (user.role === 'recruiter') data.company = await (await import('../models/Company.js')).default.findById(user.companyId);
  return data;
};

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, rollNumber, department, course, semester, graduationYear, cgpa, backlogs, phone } = req.body;
    if (!name?.trim() || !email || !password || !rollNumber || !department || !graduationYear || cgpa === undefined) return res.status(400).json({ message: 'Name, email, password, roll number and academic details are required.' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name: name.trim(), email, password: passwordHash, role: 'student' });
    try {
      await StudentProfile.create({ userId: user._id, rollNumber, department, course, semester, graduationYear, cgpa, backlogs, phone });
    } catch (error) { await User.findByIdAndDelete(user._id); throw error; }
    res.status(201).json({ token: tokenFor(user), user: await publicUser(user) });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: 'The email or password is incorrect.' });
    res.json({ token: tokenFor(user), user: await publicUser(user) });
  } catch (error) { next(error); }
});

router.get('/me', protect, async (req, res, next) => { try { res.json({ user: await publicUser(req.user) }); } catch (error) { next(error); } });
export default router;
