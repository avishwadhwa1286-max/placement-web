import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import User from '../models/User.js';
import StudentProfile from '../models/StudentProfile.js';
import Application from '../models/Application.js';
import { protect, allow } from '../middleware/auth.js';
import { resumeUpload } from '../middleware/upload.js';

const router = Router();
router.use(protect);
const pageArgs = req => ({ page: Math.max(1, Number(req.query.page) || 1), limit: Math.min(100, Math.max(1, Number(req.query.limit) || 25)) });

router.get('/', allow('admin'), async (req, res) => {
  const { page, limit } = pageArgs(req); const query = {};
  if (req.query.department) query.department = req.query.department;
  if (req.query.graduationYear) query.graduationYear = Number(req.query.graduationYear);
  if (req.query.minCGPA || req.query.maxCGPA) query.cgpa = { ...(req.query.minCGPA ? { $gte: Number(req.query.minCGPA) } : {}), ...(req.query.maxCGPA ? { $lte: Number(req.query.maxCGPA) } : {}) };
  const search = req.query.search?.trim();
  if (search) {
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matchingUsers = await User.find({ role: 'student', name: { $regex: safe, $options: 'i' } }).distinct('_id');
    query.$or = [{ rollNumber: { $regex: safe, $options: 'i' } }, { userId: { $in: matchingUsers } }];
  }
  const [items, total] = await Promise.all([
    StudentProfile.find(query).populate('userId', 'name email').sort({ rollNumber: 1 }).skip((page - 1) * limit).limit(limit),
    StudentProfile.countDocuments(query)
  ]);
  res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
});

router.get('/:id/resume', allow('admin', 'student', 'recruiter'), async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({ userId: req.params.id });
    if (!profile?.resume?.filename) return res.status(404).json({ message: 'No resume has been uploaded.' });
    if (req.user.role === 'student' && String(req.user._id) !== String(req.params.id)) return res.status(403).json({ message: 'You can only view your own resume.' });
    if (req.user.role === 'recruiter') {
      const allowed = await Application.exists({ studentId: req.params.id, companyId: req.user.companyId });
      if (!allowed) return res.status(403).json({ message: 'Resume access is limited to your applicants.' });
    }
    const filePath = path.resolve('uploads', path.basename(profile.resume.filename));
    await fs.access(filePath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(profile.resume.originalName)}"`);
    res.sendFile(filePath, error => { if (error && !res.headersSent) next(error); });
  } catch (error) { next(error); }
});

router.get('/:id', allow('admin', 'student', 'recruiter'), async (req, res) => {
  if (req.user.role === 'student' && String(req.user._id) !== req.params.id) return res.status(403).json({ message: 'You can only view your own profile.' });
  if (req.user.role === 'recruiter' && !await Application.exists({ studentId: req.params.id, companyId: req.user.companyId })) return res.status(403).json({ message: 'You can only view applicants to your company.' });
  const profile = await StudentProfile.findOne({ userId: req.params.id }).populate('userId', 'name email');
  if (!profile) return res.status(404).json({ message: 'Student not found.' });
  res.json(profile);
});

router.put('/:id', allow('admin', 'student'), async (req, res, next) => {
  try {
    if (req.user.role === 'student' && String(req.user._id) !== req.params.id) return res.status(403).json({ message: 'You can only edit your own profile.' });
    const profile = await StudentProfile.findOne({ userId: req.params.id });
    if (!profile) return res.status(404).json({ message: 'Student not found.' });
    const fields = ['rollNumber', 'department', 'course', 'semester', 'graduationYear', 'cgpa', 'backlogs', 'phone'];
    for (const field of fields) if (req.body[field] !== undefined) profile[field] = req.body[field];
    if (req.body.name && (req.user.role === 'admin' || String(req.user._id) === req.params.id)) await User.findByIdAndUpdate(req.params.id, { name: req.body.name.trim() });
    await profile.save();
    res.json({ profile, message: 'Profile updated successfully.' });
  } catch (error) { next(error); }
});

router.post('/upload-resume', allow('student'), resumeUpload.single('resume'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Choose a PDF resume to upload.' });
    const fh = await fs.open(req.file.path, 'r'); const signature = Buffer.alloc(5); await fh.read(signature, 0, 5, 0); await fh.close();
    if (signature.toString() !== '%PDF-') { await fs.unlink(req.file.path); return res.status(400).json({ message: 'This file is not a valid PDF.' }); }
    const profile = await StudentProfile.findOne({ userId: req.user._id });
    if (!profile) { await fs.unlink(req.file.path); return res.status(404).json({ message: 'Student profile not found.' }); }
    if (profile.resume?.filename) await fs.unlink(path.resolve('uploads', path.basename(profile.resume.filename))).catch(() => {});
    profile.resume = { filename: req.file.filename, originalName: req.file.originalname, contentType: 'application/pdf', size: req.file.size, uploadedAt: new Date() };
    await profile.save(); res.json({ message: 'Resume uploaded successfully.', profile });
  } catch (error) { next(error); }
});

router.delete('/:id', allow('admin'), async (req, res) => {
  await Promise.all([User.findByIdAndDelete(req.params.id), StudentProfile.findOneAndDelete({ userId: req.params.id }), Application.deleteMany({ studentId: req.params.id })]);
  res.json({ message: 'Student and related placement records removed.' });
});
export default router;
