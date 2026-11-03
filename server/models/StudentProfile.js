import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  rollNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  department: { type: String, enum: ['CSE', 'IT', 'ECE', 'Mechanical', 'Civil', 'Electrical'], required: true, index: true },
  course: { type: String, default: 'B.Tech' }, semester: { type: Number, min: 1, max: 8, default: 7 },
  graduationYear: { type: Number, required: true, index: true },
  cgpa: { type: Number, required: true, min: 0, max: 10, index: true },
  backlogs: { type: Number, required: true, min: 0, default: 0 }, phone: { type: String, default: '' },
  resume: { filename: String, originalName: String, contentType: String, size: Number, uploadedAt: Date }
}, { timestamps: true });

export default mongoose.model('StudentProfile', profileSchema);
