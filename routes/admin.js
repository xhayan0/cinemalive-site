const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const admin = require('../middleware/admin');
const { upload } = require('../middleware/upload');

// همه روت‌ها نیاز به دسترسی ادمین دارند
router.use(admin);

// آمار
router.get('/stats', adminController.getStats);

// مدیریت کاربران
router.get('/users', adminController.getUsers);
router.post('/users/subscription', adminController.addSubscription);
router.post('/users/ban', adminController.banUser);
router.post('/users/unban', adminController.unbanUser);

// مدیریت سفارشات
router.get('/orders', adminController.getOrders);
router.put('/orders/:orderId', adminController.updateOrderStatus);

// مدیریت فیلم‌ها
router.post('/movies', upload.single('poster'), adminController.addMovie);
router.delete('/movies/:id', adminController.deleteMovie);

module.exports = router;
