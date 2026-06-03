const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  studentId: { type: String, trim: true },
  department: { type: String, default: 'unknown' },
  cgpa: { type: Number, default: 0 },
  skills: [{ type: String }],
  status: { type: String, enum: ['eligible', 'ineligible', 'pending'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Student', studentSchema);
