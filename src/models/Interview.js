const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  drive: { type: mongoose.Schema.Types.ObjectId, ref: 'Drive', required: true },
  scheduledAt: { type: Date, required: true },
  round: { type: String, default: 'first' },
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  feedback: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Interview', interviewSchema);
