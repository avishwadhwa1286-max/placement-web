import { Router } from 'express';
import Application from '../models/Application.js';
import PlacementDrive from '../models/PlacementDrive.js';
import StudentProfile from '../models/StudentProfile.js';
import { protect, allow } from '../middleware/auth.js';
import { checkEligibility } from '../utils/eligibility.js';

const router = Router(); router.use(protect);
router.get('/', allow('admin', 'recruiter', 'student'), async (req, res) => {
  const query = {};
  if (req.user.role === 'student') query.studentId = req.user._id;
  if (req.user.role === 'recruiter') query.companyId = req.user.companyId;
  if (req.query.status) query.status = req.query.status;
  if (req.query.companyId && req.user.role === 'admin') query.companyId = req.query.companyId;
  const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const [items, total] = await Promise.all([Application.find(query).populate('studentId', 'name email').populate({ path: 'driveId', select: 'jobRole package deadline' }).populate('companyId', 'name').sort({ appliedAt: -1 }).skip((page - 1) * limit).limit(limit), Application.countDocuments(query)]);
  res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
});
router.post('/', allow('student'), async (req, res, next) => {
  try {
    const drive = await PlacementDrive.findById(req.body.driveId);
    if (!drive) return res.status(404).json({ message: 'Placement drive not found.' });
    if (drive.status !== 'Open' || drive.deadline <= new Date()) return res.status(400).json({ message: 'Applications for this drive are closed.' });
    const profile = await StudentProfile.findOne({ userId: req.user._id }); const eligibility = checkEligibility(profile, drive);
    if (!eligibility.eligible) return res.status(400).json({ message: 'You are not eligible for this placement drive.', reasons: eligibility.reasons });
    if (await Application.exists({ studentId: req.user._id, driveId: drive._id })) return res.status(409).json({ message: 'You have already applied for this placement drive.' });
    const application = await Application.create({ studentId: req.user._id, driveId: drive._id, companyId: drive.companyId });
    res.status(201).json({ application, message: 'Application submitted successfully.' });
  } catch (error) { next(error); }
});
router.patch('/:id/status', allow('admin', 'recruiter'), async (req, res) => {
  const allowed = ['Applied', 'Under Review', 'Shortlisted', 'Selected', 'Rejected'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: 'Choose a valid application status.' });
  const query = { _id: req.params.id }; if (req.user.role === 'recruiter') query.companyId = req.user.companyId;
  const application = await Application.findOneAndUpdate(query, { status: req.body.status, remarks: req.body.remarks || '' }, { new: true, runValidators: true }).populate('studentId', 'name email').populate('driveId', 'jobRole').populate('companyId', 'name');
  if (!application) return res.status(404).json({ message: 'Application not found.' }); res.json({ application, message: 'Application status updated.' });
});
router.delete('/:id', allow('student', 'admin'), async (req, res) => {
  const query = { _id: req.params.id }; if (req.user.role === 'student') query.studentId = req.user._id;
  const application = await Application.findOne(query); if (!application) return res.status(404).json({ message: 'Application not found.' });
  if (req.user.role === 'student' && application.status !== 'Applied') return res.status(400).json({ message: 'You may withdraw only applications that are still marked Applied.' });
  await application.deleteOne(); res.json({ message: 'Application withdrawn.' });
});
export default router;
