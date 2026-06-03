const express = require('express');
const Company = require('../models/Company');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, authorize('placement_officer', 'admin'), async (req, res) => {
  try {
    const company = await Company.create(req.body);
    res.status(201).json({ success: true, data: company });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const query = {};
    if (search) query.name = new RegExp(search, 'i');
    const companies = await Company.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Company.countDocuments(query);
    res.json({ success: true, data: companies, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.json({ success: true, data: company });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/:id', auth, authorize('placement_officer', 'admin'), async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.json({ success: true, data: company });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.json({ success: true, message: 'Company deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
