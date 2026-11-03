import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true }, description: { type: String, default: '' },
  website: { type: String, default: '' }, location: { type: String, default: '' }, industry: { type: String, default: '' },
  contactEmail: { type: String, default: '', lowercase: true }, contactName: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('Company', companySchema);
