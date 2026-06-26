const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// ثبت‌نام و ورود با ایمیل
router.post('/register', authLimiter, authController.registerWithEmail);
router.post('/login', authLimiter, authController.loginWithEmail);
router.post('/logout', auth, authController.logout);
router.get('/me', auth, authController.getCurrentUser);

// ورود با تلگرام (WebApp)
router.post('/telegram-login', authController.loginWithTelegram);

// فراموشی رمز عبور
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

// اتصال به تلگرام
router.post('/connect-telegram', auth, authController.connectTelegram);
router.post('/send-telegram-otp', auth, authController.sendTelegramOTP);
router.post('/verify-telegram-otp', auth, authController.verifyTelegramOTP);

module.exports = router;
