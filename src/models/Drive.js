const mongoose = require('mongoose');

const driveSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  description: { type: String, default: '' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  driveType: { type: String, enum: ['internship', 'full-time'], default: 'full-time' },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Drive', driveSchema);
