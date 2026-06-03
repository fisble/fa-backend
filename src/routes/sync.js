const express = require('express');
const axios = require('axios');
const { auth, authorize } = require('../middleware/auth');
const Student = require('../models/Student');
const Company = require('../models/Company');

const router = express.Router();

router.post('/dataset', auth, authorize('placement_officer', 'admin'), async (req, res) => {
  try {
    const endpoint = process.env.EXTERNAL_DATA_URL || req.body.url;
    const email = process.env.EXTERNAL_DATA_EMAIL || req.body.email;
    const password = process.env.EXTERNAL_DATA_PASSWORD || req.body.password;
    if (!endpoint || !email || !password) {
      return res.status(400).json({ success: false, message: 'Sync credentials are required' });
    }
    const login = await axios.post(`${endpoint}/auth/login`, { email, password }, {
      headers: { 'Content-Type': 'application/json' }
    });
    const token = login.data?.token || login.data?.data?.token;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Failed to authenticate external dataset API' });
    }
    const response = await axios.get(`${endpoint}/students`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = Array.isArray(response.data?.data) ? response.data.data : response.data;
    const saved = [];
    for (const studentItem of data) {
      const payload = {
        name: studentItem.name || studentItem.fullName || 'Unknown',
        email: studentItem.email || studentItem.studentEmail || '',
        department: studentItem.department || studentItem.dept || 'unknown',
        cgpa: Number(studentItem.cgpa || studentItem.CGPA || 0),
        skills: Array.isArray(studentItem.skills) ? studentItem.skills : [],
        status: studentItem.status || 'pending'
      };
      if (!payload.email) continue;
      const student = await Student.findOneAndUpdate({ email: payload.email }, payload, { upsert: true, new: true, runValidators: true });
      saved.push(student);
    }
    res.json({ success: true, data: saved, message: 'Dataset synchronized' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/health', async (req, res) => {
  res.json({ success: true, message: 'Sync endpoint available' });
});

module.exports = router;
