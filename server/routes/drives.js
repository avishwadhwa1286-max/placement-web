import { Router } from 'express';
import PlacementDrive from '../models/PlacementDrive.js';
import Company from '../models/Company.js';
import Application from '../models/Application.js';
import StudentProfile from '../models/StudentProfile.js';
import { protect, allow } from '../middleware/auth.js';
import { checkEligibility } from '../utils/eligibility.js';

const router = Router(); router.use(protect);
const fields = ['companyId', 'jobRole', 'description', 'package', 'location', 'minimumCGPA', 'maximumBacklogs', 'eligibleDepartments', 'graduationYear', 'deadline', 'status'];
async function scopedDrive(id, user) { const drive = await PlacementDrive.findById(id).populate('companyId'); if (drive && user.role === 'recruiter' && String(drive.companyId?._id) !== String(user.companyId)) return null; return drive; }
router.get('/', async (req, res) => {
  const query = {}; if (req.user.role === 'recruiter') query.companyId = req.user.companyId;
  if (req.query.status) query.status = req.query.status;
  if (req.query.companyId && req.user.role === 'admin') query.companyId = req.query.companyId;
  if (req.user.role === 'student') { query.status = 'Open'; query.deadline = { $gt: new Date() }; }
  const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const [drives, total, profile, applications] = await Promise.all([
    PlacementDrive.find(query).populate('companyId', 'name industry location').sort({ deadline: 1 }).skip((page - 1) * limit).limit(limit), PlacementDrive.countDocuments(query),
    req.user.role === 'student' ? StudentProfile.findOne({ userId: req.user._id }) : null,
    req.user.role === 'student' ? Application.find({ studentId: req.user._id }).select('driveId status') : []
  ]);
  const apps = new Map(applications.map(a => [String(a.driveId), a.status]));
  res.json({ items: drives.map(d => ({ ...d.toObject(), eligibility: req.user.role === 'student' ? checkEligibility(profile, d) : undefined, applicationStatus: apps.get(String(d._id)) || null, applicationCount: undefined })), page, limit, total, pages: Math.ceil(total / limit) });
});
router.post('/', allow('admin', 'recruiter'), async (req, res, next) => {
  try { const data = {}; for (const f of fields) if (req.body[f] !== undefined) data[f] = req.body[f]; if (req.user.role === 'recruiter') data.companyId = req.user.companyId; const company = await Company.findById(data.companyId); if (!company) return res.status(400).json({ message: 'Choose a valid company.' }); const drive = await PlacementDrive.create(data); res.status(201).json(drive); }
  catch (error) { next(error); }
});
router.get('/:id', async (req, res) => { const drive = await scopedDrive(req.params.id, req.user); if (!drive) return res.status(404).json({ message: 'Drive not found.' }); let eligibility; if (req.user.role === 'student') eligibility = checkEligibility(await StudentProfile.findOne({ userId: req.user._id }), drive); res.json({ drive, eligibility }); });
router.put('/:id', allow('admin', 'recruiter'), async (req, res, next) => {
  try { const drive = await scopedDrive(req.params.id, req.user); if (!drive) return res.status(404).json({ message: 'Drive not found.' }); for (const f of fields) if (f !== 'companyId' && req.body[f] !== undefined) drive[f] = req.body[f]; if (req.user.role === 'admin' && req.body.companyId) drive.companyId = req.body.companyId; await drive.save(); res.json(drive); }
  catch (error) { next(error); }
});
router.delete('/:id', allow('admin', 'recruiter'), async (req, res) => { const drive = await scopedDrive(req.params.id, req.user); if (!drive) return res.status(404).json({ message: 'Drive not found.' }); await Promise.all([drive.deleteOne(), Application.deleteMany({ driveId: drive._id })]); res.json({ message: 'Drive and its applications removed.' }); });
export default router;
