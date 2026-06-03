const mongoose = require('mongoose');

const driveSchema = new mongoose.Schema({
  driveId: { type: String, unique: true, trim: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  companyId: { type: String, trim: true },
  title: { type: String, required: true, trim: true },
  mode: { type: String, default: '' },
  location: { type: String, default: '' },
  registrationDeadline: { type: String, default: '' },
  rounds: [{ type: String }],
  status: { type: String, default: 'open' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Drive', driveSchema);
