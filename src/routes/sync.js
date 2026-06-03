const express = require('express');
const axios = require('axios');
const { auth, authorize } = require('../middleware/auth');
const Student = require('../models/Student');

const router = express.Router();

async function getExamToken(tokenUrl, studentId, studentPassword) {
  if (!tokenUrl || !studentId || !studentPassword) {
    throw new Error('Missing external sync credentials');
  }
  const res = await axios.post(tokenUrl, { studentId, password: studentPassword }, {
    headers: { 'Content-Type': 'application/json' }
  });
  return res.data?.token || res.data?.data?.token || res.data?.access_token;
}

async function getExamData(dataUrl, token) {
  if (!dataUrl || !token) {
    throw new Error('Missing external data url or token');
  }
  const res = await axios.get(dataUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
}

router.post('/dataset', auth, authorize('placement_officer', 'admin'), async (req, res) => {
  try {
    const tokenUrl = req.body.tokenUrl || process.env.TOKEN_URL;
    const dataUrl = req.body.dataUrl || process.env.DATA_URL;
    const studentId = req.body.studentId || process.env.STUDENT_ID;
    const studentPassword = req.body.studentPassword || process.env.STUDENT_PASSWORD;

    const token = await getExamToken(tokenUrl, studentId, studentPassword);
    if (!token) return res.status(401).json({ success: false, message: 'Failed to obtain exam token' });

    const records = await getExamData(dataUrl, token);
    const saved = [];
    for (const item of records) {
      const payload = {
        studentId: item.studentId || item.userid || item.id || item._id || '',
        name: item.name || item.fullName || item.studentName || 'Unknown',
        email: item.email || item.studentEmail || '',
        department: item.department || item.dept || 'unknown',
        cgpa: Number(item.cgpa || item.CGPA || 0) || 0,
        skills: Array.isArray(item.skills) ? item.skills : (typeof item.skills === 'string' ? item.skills.split(',').map(s => s.trim()).filter(Boolean) : []),
        status: item.status || 'pending'
      };
      if (!payload.email) continue;
      const student = await Student.findOneAndUpdate(
        { email: payload.email },
        payload,
        { upsert: true, new: true, runValidators: true }
      );
      saved.push(student);
    }
    res.json({ success: true, data: saved, message: `Synchronized ${saved.length} students` });
  } catch (error) {
    res.status(500).json({ success: false, message: error?.response?.data?.message || error.message || 'Sync failed' });
  }
});

router.get('/health', async (req, res) => {
  res.json({ success: true, message: 'Sync endpoint available' });
});

module.exports = router;
