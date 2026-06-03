const express = require('express');
const Drive = require('../models/Drive');
const Company = require('../models/Company');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, authorize('placement_officer', 'admin'), async (req, res) => {
  try {
    const { company, title, startDate, endDate, description, driveType } = req.body;
    const companyExists = await Company.findById(company);
    if (!companyExists) return res.status(404).json({ success: false, message: 'Company not found' });
    const drive = await Drive.create({ company, title, startDate, endDate, description, driveType });
    res.status(201).json({ success: true, data: drive });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const query = {};
    if (search) query.$or = [
      { title: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') }
    ];
    if (status) query.status = status;
    const drives = await Drive.find(query).populate('company','name').skip((page-1)*limit).limit(Number(limit));
    const total = await Drive.countDocuments(query);
    res.json({ success: true, data: drives, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const drive = await Drive.findById(req.params.id).populate('company','name');
    if (!drive) return res.status(404).json({ success: false, message: 'Drive not found' });
    res.json({ success: true, data: drive });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/:id', auth, authorize('placement_officer', 'admin'), async (req, res) => {
  try {
    const drive = await Drive.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!drive) return res.status(404).json({ success: false, message: 'Drive not found' });
    res.json({ success: true, data: drive });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const drive = await Drive.findByIdAndDelete(req.params.id);
    if (!drive) return res.status(404).json({ success: false, message: 'Drive not found' });
    res.json({ success: true, message: 'Drive deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
