import { Router } from 'express';
import Announcement from '../models/Announcement.js';
import { protect, allow } from '../middleware/auth.js';

const router = Router(); router.use(protect);
router.get('/', async (req, res) => { const audience = req.user.role === 'student' ? ['all', 'students'] : req.user.role === 'recruiter' ? ['all', 'recruiters'] : ['all', 'students', 'recruiters']; res.json(await Announcement.find({ audience: { $in: audience } }).populate('postedBy', 'name').sort({ createdAt: -1 })); });
router.post('/', allow('admin'), async (req, res) => { const { title, body, audience = 'all' } = req.body; if (!title?.trim() || !body?.trim()) return res.status(400).json({ message: 'Title and announcement text are required.' }); res.status(201).json(await Announcement.create({ title, body, audience, postedBy: req.user._id })); });
router.delete('/:id', allow('admin'), async (req, res) => { const announcement = await Announcement.findByIdAndDelete(req.params.id); if (!announcement) return res.status(404).json({ message: 'Announcement not found.' }); res.json({ message: 'Announcement removed.' }); });
export default router;
