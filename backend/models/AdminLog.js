/* ══════════════════════════════════════════
   models/AdminLog.js — Admin Activity Log
   Records admin actions for audit trail.
══════════════════════════════════════════ */

const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true
  },
  dotColor: {
    type: String,
    default: 'blue'
  },
  actionType: {
    type: String,
    default: 'general'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AdminLog', adminLogSchema);
