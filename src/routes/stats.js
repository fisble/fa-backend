const express = require('express');
const Student = require('../models/Student');
const Company = require('../models/Company');
const Drive = require('../models/Drive');
const Application = require('../models/Application');
const { auth } = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const students = await Student.countDocuments();
    const companies = await Company.countDocuments();
    const drives = await Drive.countDocuments();
    const applications = await Application.countDocuments();
    const selected = await Application.countDocuments({ status: 'selected' });
    const rejected = await Application.countDocuments({ status: 'rejected' });
    const pending = await Application.countDocuments({ status: 'pending' });
    const companyStats = await Company.aggregate([
      { $lookup: { from: 'drives', localField: '_id', foreignField: 'company', as: 'drives' } },
      { $project: { name: 1, drivesCount: { $size: '$drives' } } }
    ]);
    res.json({
      success: true,
      data: {
        totals: { students, companies, drives, applications, selected, rejected, pending },
        companyStats,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
