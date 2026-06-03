const express = require('express');
const { syncTasksFromExam } = require('../services/taskService');
const Task = require('../models/Task');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

// POST /api/tasks/sync
router.post('/sync', auth, authorize('placement_officer','admin'), async (req, res) => {
  try {
    const stats = await syncTasksFromExam();
    res.json({ success: true, ...stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/tasks
router.get('/', auth, async (req, res) => {
  try {
    const { q, priority, completed, page = 1, limit = 10 } = req.query;
    const query = {};
    if (q) query.$or = [ { title: new RegExp(q,'i') }, { description: new RegExp(q,'i') } ];
    if (priority) query.priority = priority;
    if (typeof completed !== 'undefined') query.completed = (String(completed) === 'true');
    const items = await Task.find(query).skip((page-1)*limit).limit(Number(limit));
    const total = await Task.countDocuments(query);
    res.json({ success: true, data: items, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/search', auth, async (req, res) => {
  try {
    const { q, priority, completed, page = 1, limit = 10 } = req.query;
    const query = {};
    if (q) query.$or = [ { title: new RegExp(q,'i') }, { description: new RegExp(q,'i') } ];
    if (priority) query.priority = priority;
    if (typeof completed !== 'undefined') query.completed = (String(completed) === 'true');
    const items = await Task.find(query).skip((page-1)*limit).limit(Number(limit));
    const total = await Task.countDocuments(query);
    res.json({ success: true, data: items, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Task.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
