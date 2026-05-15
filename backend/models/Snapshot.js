/* ══════════════════════════════════════════
   models/Snapshot.js — Daily Snapshot Schema
   Archives habit state at end of each day.
   Used ONLY for calendar/history viewing.
   Never overwrites live Habit documents.
══════════════════════════════════════════ */

const mongoose = require('mongoose');

const snapshotHabitSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  streak:   { type: Number, default: 0 },
  done:     { type: Boolean, default: false },
  lastDone: { type: String, default: null },
  missed:   { type: Boolean, default: false }
}, { _id: false });

const snapshotSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String,
    required: true
  },
  habits: [snapshotHabitSchema]
}, { timestamps: true });

// Compound index: one snapshot per user per day
snapshotSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Snapshot', snapshotSchema);
