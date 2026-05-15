/* ══════════════════════════════════════════
   models/Habit.js — Habit Schema
   Each habit belongs to a user (via userId).
   done=true ONLY when user explicitly marks it today.
   streak persists across daily resets.
══════════════════════════════════════════ */

const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Habit name is required'],
    trim: true,
    maxlength: 100
  },
  streak: {
    type: Number,
    default: 0
  },
  done: {
    type: Boolean,
    default: false
  },
  lastDone: {
    type: String,
    default: null
  },
  missed: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Habit', habitSchema);
