const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  applicationId: { type: String, unique: true, trim: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  drive: { type: mongoose.Schema.Types.ObjectId, ref: 'Drive' },
  studentId: { type: String, trim: true },
  driveId: { type: String, trim: true },
  currentRound: { type: String, default: '' },
  status: { type: String, default: 'pending' },
  appliedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Application', applicationSchema);
