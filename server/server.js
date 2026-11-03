import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import companyRoutes from './routes/companies.js';
import driveRoutes from './routes/drives.js';
import applicationRoutes from './routes/applications.js';
import statsRoutes from './routes/stats.js';
import announcementRoutes from './routes/announcements.js';
import { notFound, errorHandler } from './utils/errors.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'placement-cell-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/drives', driveRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/announcements', announcementRoutes);
app.use(notFound); app.use(errorHandler);

const port = Number(process.env.PORT) || 5000;
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is missing. Copy server/.env.example to server/.env and set a secret.');
connectDB().then(() => app.listen(port, () => console.log(`Placement Cell API listening on http://localhost:${port}`))).catch(error => { console.error('Could not connect to MongoDB:', error.message); process.exit(1); });
