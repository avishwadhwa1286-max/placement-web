import mongoose from 'mongoose';

const driveSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  jobRole: { type: String, required: true, trim: true }, description: { type: String, required: true },
  package: { type: Number, required: true, min: 0 }, location: { type: String, required: true },
  minimumCGPA: { type: Number, required: true, min: 0, max: 10 }, maximumBacklogs: { type: Number, required: true, min: 0 },
  eligibleDepartments: { type: [{ type: String, enum: ['CSE', 'IT', 'ECE', 'Mechanical', 'Civil', 'Electrical'] }], validate: { validator: departments => departments.length > 0, message: 'Choose at least one eligible department.' } },
  graduationYear: { type: Number, required: true, index: true }, deadline: { type: Date, required: true },
  status: { type: String, enum: ['Open', 'Closed', 'Draft'], default: 'Open', index: true }
}, { timestamps: true });

export default mongoose.model('PlacementDrive', driveSchema);
