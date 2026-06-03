const axios = require('axios');
const Task = require('../models/Task');

async function fetchToken() {
  const tokenUrl = process.env.TOKEN_URL;
  const studentId = process.env.STUDENT_ID;
  const studentPassword = process.env.STUDENT_PASSWORD;
  if (!tokenUrl || !studentId || !studentPassword) throw new Error('Token credentials not configured');
  const res = await axios.post(tokenUrl, { studentId, password: studentPassword }, { headers: { 'Content-Type': 'application/json' } });
  return res.data?.token || res.data?.data?.token || res.data?.access_token || null;
}

async function fetchPrivateData(token) {
  const dataUrl = process.env.DATA_URL;
  if (!dataUrl) throw new Error('DATA_URL not configured');
  const res = await axios.get(dataUrl, { headers: { Authorization: `Bearer ${token}` } });
  return Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
}

async function syncTasksFromExam() {
  const token = await fetchToken();
  if (!token) throw new Error('Failed to obtain token');
  const items = await fetchPrivateData(token);
  let inserted = 0, duplicates = 0, rejected = 0;
  for (const it of items) {
    try {
      const externalId = it.id || it._id || it.externalId || JSON.stringify(it).slice(0,50);
      const payload = {
        title: it.title || it.name || 'Untitled',
        description: it.description || it.body || '',
        completed: !!it.completed,
        priority: it.priority || 'low',
        externalId,
        meta: it,
      };
      const existing = await Task.findOne({ externalId });
      if (existing) {
        duplicates++;
        await Task.findByIdAndUpdate(existing._id, payload, { new: true });
      } else {
        await Task.create(payload);
        inserted++;
      }
    } catch (err) {
      rejected++;
    }
  }
  return { totalFetched: items.length, inserted, duplicates, rejected };
}

module.exports = { syncTasksFromExam, fetchToken, fetchPrivateData };
