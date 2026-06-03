const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  drive: { type: mongoose.Schema.Types.ObjectId, ref: 'Drive', required: true },
  status: { type: String, enum: ['pending', 'selected', 'rejected'], default: 'pending' },
  appliedAt: { type: Date, default: Date.now },
  feedback: { type: String, default: '' },
});

module.exports = mongoose.model('Application', applicationSchema);
