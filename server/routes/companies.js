import { Router } from 'express';
import bcrypt from 'bcryptjs';
import Company from '../models/Company.js';
import User from '../models/User.js';
import PlacementDrive from '../models/PlacementDrive.js';
import Application from '../models/Application.js';
import { protect, allow } from '../middleware/auth.js';

const router = Router(); router.use(protect);
router.get('/', allow('admin'), async (_req, res) => res.json(await Company.find().sort({ name: 1 })));
router.get('/mine', allow('recruiter'), async (req, res) => {
  const company = await Company.findById(req.user.companyId); if (!company) return res.status(404).json({ message: 'Company profile not found.' }); res.json(company);
});
router.post('/', allow('admin'), async (req, res, next) => {
  try {
    const { recruiterEmail, recruiterPassword, ...fields } = req.body;
    if (!recruiterEmail || !recruiterPassword || recruiterPassword.length < 8) return res.status(400).json({ message: 'A recruiter email and password of at least 8 characters are required.' });
    const company = await Company.create(fields);
    try { await User.create({ name: req.body.contactName || `${company.name} Recruiter`, email: recruiterEmail, password: await bcrypt.hash(recruiterPassword, 12), role: 'recruiter', companyId: company._id }); }
    catch (error) { await Company.findByIdAndDelete(company._id); throw error; }
    res.status(201).json(company);
  } catch (error) { next(error); }
});
router.get('/:id', allow('admin'), async (req, res) => { const company = await Company.findById(req.params.id); if (!company) return res.status(404).json({ message: 'Company not found.' }); res.json(company); });
router.put('/mine', allow('recruiter'), async (req, res, next) => {
  try { const fields = ['name', 'description', 'website', 'location', 'industry', 'contactEmail', 'contactName']; const updates = {}; for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f]; const company = await Company.findByIdAndUpdate(req.user.companyId, updates, { new: true, runValidators: true }); res.json(company); }
  catch (error) { next(error); }
});
router.put('/:id', allow('admin'), async (req, res, next) => {
  try { const fields = ['name', 'description', 'website', 'location', 'industry', 'contactEmail', 'contactName']; const updates = {}; for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f]; const company = await Company.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }); if (!company) return res.status(404).json({ message: 'Company not found.' }); res.json(company); }
  catch (error) { next(error); }
});
router.delete('/:id', allow('admin'), async (req, res) => {
  const drives = await PlacementDrive.find({ companyId: req.params.id }).select('_id');
  await Promise.all([Company.findByIdAndDelete(req.params.id), User.deleteMany({ companyId: req.params.id }), PlacementDrive.deleteMany({ companyId: req.params.id }), Application.deleteMany({ companyId: req.params.id, driveId: { $in: drives.map(d => d._id) } })]);
  res.json({ message: 'Company, recruiter account, drives and applications removed.' });
});
export default router;
