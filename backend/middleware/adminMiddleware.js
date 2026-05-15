/* ══════════════════════════════════════════
   middleware/adminMiddleware.js — Admin Role Guard
   Must be used AFTER authMiddleware.protect().
══════════════════════════════════════════ */

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied — admin privileges required'
    });
  }
  next();
};

module.exports = { adminOnly };
