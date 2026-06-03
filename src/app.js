const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const companyRoutes = require('./routes/companies');
const driveRoutes = require('./routes/drives');
const applicationRoutes = require('./routes/applications');
const interviewRoutes = require('./routes/interviews');
const syncRoutes = require('./routes/sync');
const statsRoutes = require('./routes/stats');
const analyticsRoutes = require('./routes/analytics');
const tasksRoutes = require('./routes/tasks');

const app = express();
app.use(cors());
// simple request logger for debugging
app.use((req, res, next) => {
    console.log('REQ', req.method, req.originalUrl);
    next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
    res.json({ success: true, message: 'Server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/drives', driveRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/tasks', tasksRoutes);

app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler to surface stack traces during local debugging
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err && err.stack ? err.stack : err);
    res.status(500).json({ success: false, message: err?.message || 'Internal server error' });
});

module.exports = app;
