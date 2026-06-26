const express = require('express');
const router = express.Router();
const moviesController = require('../controllers/moviesController');

// دریافت لیست فیلم‌ها (عمومی - بدون نیاز به لاگین)
router.get('/', moviesController.getMovies);

// دریافت اطلاعات یک فیلم
router.get('/:id', moviesController.getMovie);

module.exports = router;
