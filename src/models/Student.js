const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  studentId: { type: String, unique: true, trim: true },
  department: { type: String, default: 'unknown' },
  cgpa: { type: Number, default: 0 },
  skills: [{ type: String }],
  graduationYear: { type: Number, default: 0 },
  phone: { type: String, default: '' },
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Student', studentSchema);
