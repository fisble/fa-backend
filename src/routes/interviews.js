const express = require('express');
const Interview = require('../models/Interview');
const Student = require('../models/Student');
const Company = require('../models/Company');
const Drive = require('../models/Drive');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, authorize('placement_officer', 'admin'), async (req, res) => {
  try {
    const { student, company, drive, scheduledAt, round, status, feedback } = req.body;
    const studentExists = await Student.findById(student);
    const companyExists = await Company.findById(company);
    const driveExists = await Drive.findById(drive);
    if (!studentExists || !companyExists || !driveExists) {
      return res.status(404).json({ success: false, message: 'Student, company, or drive not found' });
    }
    const interview = await Interview.create({ student, company, drive, scheduledAt, round, status, feedback });
    res.status(201).json({ success: true, data: interview });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { studentId, companyId, driveId, status, page = 1, limit = 10 } = req.query;
    const query = {};
    if (studentId) query.student = studentId;
    if (companyId) query.company = companyId;
    if (driveId) query.drive = driveId;
    if (status) query.status = status;
    const interviews = await Interview.find(query)
      .populate('student', 'name email')
      .populate('company', 'name')
      .populate('drive', 'title')
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Interview.countDocuments(query);
    res.json({ success: true, data: interviews, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate('student', 'name email')
      .populate('company', 'name')
      .populate('drive', 'title');
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
    res.json({ success: true, data: interview });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/:id', auth, authorize('placement_officer', 'admin'), async (req, res) => {
  try {
    const interview = await Interview.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
    res.json({ success: true, data: interview });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
