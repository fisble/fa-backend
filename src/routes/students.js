const express = require('express');
const Student = require('../models/Student');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, authorize('placement_officer', 'admin'), async (req, res) => {
  try {
    const data = req.body;
    const student = await Student.create(data);
    res.status(201).json({ success: true, data: student });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { search, department, status, page = 1, limit = 10 } = req.query;
    const query = {};
    if (search) query.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { skills: new RegExp(search, 'i') }
    ];
    if (department) query.department = department;
    if (status) query.status = status;
    const students = await Student.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Student.countDocuments(query);
    res.json({ success: true, data: students, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/:id', auth, authorize('placement_officer', 'admin'), async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
