const express = require('express');
const router = express.Router();
const roomsController = require('../controllers/roomsController');
const auth = require('../middleware/auth');

// همه روت‌ها نیاز به احراز هویت دارند
router.use(auth);

// ساخت اتاق
router.post('/create', roomsController.createRoom);

// دریافت اتاق با کد
router.get('/:code', roomsController.getRoomByCode);

// دریافت اتاق‌های من
router.get('/my/rooms', roomsController.getMyRooms);

// ویرایش نام اتاق
router.put('/:roomId/name', roomsController.updateRoomName);

// درخواست ورود به اتاق
router.post('/:code/join', roomsController.requestJoin);

// تأیید/رد درخواست ورود
router.post('/:roomId/handle-request', roomsController.handleJoinRequest);

// بن کاربر
router.post('/:roomId/ban', roomsController.banUser);

// خارج کردن از بن
router.post('/:roomId/unban', roomsController.unbanUser);

// سکوت/رفع سکوت
router.post('/:roomId/toggle-mute', roomsController.toggleMute);

// خروج از اتاق
router.post('/:roomId/leave', roomsController.leaveRoom);

// دریافت لیست اعضا
router.get('/:roomId/members', roomsController.getRoomMembers);

module.exports = router;
