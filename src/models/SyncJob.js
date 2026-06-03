const mongoose = require('mongoose');

const syncJobSchema = new mongoose.Schema({
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date },
  status: { type: String, enum: ['running', 'completed', 'failed'], default: 'running' },
  runBy: { type: String },
  options: { type: Object },
  processed: { type: Object, default: {} },
  saved: { type: Object, default: {} },
  rejected: { type: Object, default: {} },
  finalCounts: { type: Object, default: {} },
  error: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('SyncJob', syncJobSchema);
