const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  companyId: { type: String, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  role: { type: String, default: '' },
  package: { type: Number, default: 0 },
  eligibleDepartments: [{ type: String }],
  minimumCgpa: { type: Number, default: 0 },
  driveDate: { type: String, default: '' },
  status: { type: String, default: 'upcoming' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Company', companySchema);
