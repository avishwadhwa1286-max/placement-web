import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  driveId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlacementDrive', required: true, index: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  status: { type: String, enum: ['Applied', 'Under Review', 'Shortlisted', 'Selected', 'Rejected'], default: 'Applied', index: true },
  appliedAt: { type: Date, default: Date.now }, remarks: { type: String, default: '' }
}, { timestamps: true });
applicationSchema.index({ studentId: 1, driveId: 1 }, { unique: true });

export default mongoose.model('Application', applicationSchema);
