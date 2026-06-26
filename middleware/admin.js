const auth = require('./auth');

const admin = async (req, res, next) => {
  // ابتدا احراز هویت رو چک کن
  auth(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'دسترسی غیرمجاز. فقط ادمین می‌تواند وارد شود.' });
    }
  });
};

module.exports = admin;
