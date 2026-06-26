const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');
const auth = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.use(auth);

// ثبت سفارش جدید (با آپلود اسکرین‌شات)
router.post('/create', upload.single('screenshot'), ordersController.createOrder);

// دریافت سفارشات من
router.get('/my', ordersController.getMyOrders);

module.exports = router;
