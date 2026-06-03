const express = require('express');
const Application = require('../models/Application');
const Student = require('../models/Student');
const Drive = require('../models/Drive');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, authorize('student', 'placement_officer', 'admin'), async (req, res) => {
  try {
    const { student, drive } = req.body;
    const studentExists = await Student.findById(student);
    const driveExists = await Drive.findById(drive);
    if (!studentExists || !driveExists) {
      return res.status(404).json({ success: false, message: 'Student or drive not found' });
    }
    const existing = await Application.findOne({ student, drive });
    if (existing) return res.status(409).json({ success: false, message: 'Already applied' });
    const application = await Application.create({ student, drive });
    res.status(201).json({ success: true, data: application });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { status, studentId, driveId, page = 1, limit = 10 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (studentId) query.student = studentId;
    if (driveId) query.drive = driveId;
    const applications = await Application.find(query)
      .populate('student', 'name email')
      .populate('drive', 'title')
      .skip((page-1)*limit)
      .limit(Number(limit));
    const total = await Application.countDocuments(query);
    res.json({ success: true, data: applications, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/:id', auth, authorize('placement_officer', 'admin'), async (req, res) => {
  try {
    const application = await Application.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });
    res.json({ success: true, data: application });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
