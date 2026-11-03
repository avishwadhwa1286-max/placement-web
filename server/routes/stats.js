import { Router } from 'express';
import User from '../models/User.js';
import StudentProfile from '../models/StudentProfile.js';
import Company from '../models/Company.js';
import PlacementDrive from '../models/PlacementDrive.js';
import Application from '../models/Application.js';
import { protect, allow } from '../middleware/auth.js';

const router = Router(); router.use(protect);
router.get('/dashboard', async (req, res) => {
  if (req.user.role === 'student') {
    const [profile, availableDrives, applications, announcements] = await Promise.all([StudentProfile.findOne({ userId: req.user._id }), PlacementDrive.find({ status: 'Open', deadline: { $gt: new Date() } }), Application.find({ studentId: req.user._id }).populate('companyId', 'name').populate('driveId', 'jobRole'), (await import('../models/Announcement.js')).default.countDocuments({ audience: { $in: ['all', 'students'] } })]);
    const eligible = (await import('../utils/eligibility.js')).checkEligibility;
    const eligibleCount = profile ? availableDrives.filter(d => eligible(profile, d).eligible).length : 0;
    return res.json({ totalAvailableDrives: availableDrives.length, eligibleDrives: eligibleCount, appliedCompanies: new Set(applications.map(a => String(a.companyId?._id))).size, applications: applications.map(a => ({ status: a.status, company: a.companyId?.name, role: a.driveId?.jobRole, appliedAt: a.appliedAt })), announcementCount: announcements });
  }
  if (req.user.role === 'recruiter') {
    const [drives, applications, applicants] = await Promise.all([PlacementDrive.countDocuments({ companyId: req.user.companyId }), Application.countDocuments({ companyId: req.user.companyId }), Application.aggregate([{ $match: { companyId: req.user.companyId } }, { $group: { _id: '$status', count: { $sum: 1 } } }])]);
    return res.json({ drives, applications, statuses: Object.fromEntries(applicants.map(a => [a._id, a.count])) });
  }
  const [students, companies, drives, applications, placed, departmentRows, companyRows] = await Promise.all([
    User.countDocuments({ role: 'student' }), Company.countDocuments(), PlacementDrive.countDocuments(), Application.countDocuments(),
    Application.distinct('studentId', { status: 'Selected' }),
    Application.aggregate([{ $match: { status: 'Selected' } }, { $lookup: { from: 'studentprofiles', localField: 'studentId', foreignField: 'userId', as: 'profile' } }, { $unwind: '$profile' }, { $group: { _id: '$profile.department', placed: { $addToSet: '$studentId' } } }, { $project: { department: '$_id', placed: { $size: '$placed' } } }, { $sort: { department: 1 } }]),
    Application.aggregate([{ $match: { status: 'Selected' } }, { $lookup: { from: 'companies', localField: 'companyId', foreignField: '_id', as: 'company' } }, { $unwind: '$company' }, { $group: { _id: '$company.name', placed: { $addToSet: '$studentId' } } }, { $project: { company: '$_id', placed: { $size: '$placed' } } }, { $sort: { placed: -1 } }])
  ]);
  res.json({ students, companies, drives, applications, placed: placed.length, placementPercentage: students ? Math.round(placed.length / students * 1000) / 10 : 0, departmentStats: departmentRows, companyStats: companyRows });
});
export default router;
