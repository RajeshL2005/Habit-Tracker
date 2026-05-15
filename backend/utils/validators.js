/* ══════════════════════════════════════════
   utils/validators.js — Input Validation
══════════════════════════════════════════ */

function validateSignup({ username, email, password }) {
  const errors = [];
  if (!username || username.trim().length < 3)
    errors.push('Username must be at least 3 characters');
  if (!email || !/\S+@\S+\.\S+/.test(email))
    errors.push('Valid email is required');
  if (!password || password.length < 6)
    errors.push('Password must be at least 6 characters');
  return errors;
}

function validateLogin({ username, password }) {
  const errors = [];
  if (!username || !username.trim())
    errors.push('Username or email is required');
  if (!password || !password.trim())
    errors.push('Password is required');
  return errors;
}

function validateHabitName(name) {
  if (!name || !name.trim()) return 'Habit name is required';
  if (name.trim().length > 100) return 'Habit name too long (max 100 chars)';
  return null;
}

module.exports = { validateSignup, validateLogin, validateHabitName };
