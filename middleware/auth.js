const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // چک کردن سشن
    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user && !user.is_banned) {
        req.user = user;
        return next();
      }
    }

    // چک کردن توکن (برای API)
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user && !user.is_banned) {
        req.user = user;
        return next();
      }
    }

    res.status(401).json({ error: 'لطفاً وارد حساب کاربری خود شوید.' });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'خطا در احراز هویت' });
  }
};

module.exports = auth;
