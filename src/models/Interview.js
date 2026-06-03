const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  interviewId: { type: String, unique: true, trim: true },
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  applicationId: { type: String, trim: true },
  interviewer: { type: String, default: '' },
  round: { type: String, default: '' },
  scheduledAt: { type: Date },
  result: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Interview', interviewSchema);
