const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Order = require('../models/Order');
const Movie = require('../models/Movie');
const MovieLink = require('../models/MovieLink');
const Room = require('../models/Room');
const { upload } = require('../middleware/upload');
const fs = require('fs-extra');
const path = require('path');

// ---------- دریافت آمار کلی ----------
exports.getStats = async (req, res) => {
  try {
    const totalUsers = await User.getTotalCount();
    const totalOrders = await Order.getTotalCount();
    const pendingOrders = (await Order.getPendingOrders()).length;
    const activeSubscriptions = await Subscription.getActiveCount();

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalOrders,
        pendingOrders,
        activeSubscriptions
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'خطا در دریافت آمار.' });
  }
};

// ---------- مدیریت کاربران ----------
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const users = await User.getAll(parseInt(limit), parseInt(offset), search);
    const total = await User.getTotalCount(search);

    res.json({
      success: true,
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'خطا در دریافت لیست کاربران.' });
  }
};

// ---------- افزودن اشتراک به کاربر ----------
exports.addSubscription = async (req, res) => {
  try {
    const { userId, planType, durationDays, maxUsers } = req.body;

    if (!userId || !planType) {
      return res.status(400).json({ error: 'اطلاعات کامل نیست.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد.' });
    }

    // غیرفعال کردن اشتراک قبلی
    await Subscription.deactivateByUserId(userId);

    // ایجاد اشتراک جدید
    await Subscription.create({
      userId,
      planType,
      maxUsers: maxUsers || 2,
      durationDays: durationDays || 30
    });

    res.json({
      success: true,
      message: 'اشتراک با موفقیت به کاربر اضافه شد.'
    });

  } catch (error) {
    console.error('Add subscription error:', error);
    res.status(500).json({ error: 'خطا در افزودن اشتراک.' });
  }
};

// ---------- مسدود کردن کاربر ----------
exports.banUser = async (req, res) => {
  try {
    const { userId, reason } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'آیدی کاربر را وارد کنید.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد.' });
    }

    await User.ban(userId, reason || 'بدون دلیل');

    res.json({
      success: true,
      message: `کاربر ${user.username} با موفقیت مسدود شد.`
    });

  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'خطا در مسدود کردن کاربر.' });
  }
};

// ---------- رفع مسدودیت کاربر ----------
exports.unbanUser = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'آیدی کاربر را وارد کنید.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد.' });
    }

    await User.unban(userId);

    res.json({
      success: true,
      message: `مسدودیت کاربر ${user.username} برداشته شد.`
    });

  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ error: 'خطا در رفع مسدودیت کاربر.' });
  }
};

// ---------- مشاهده سفارشات (برای ادمین) ----------
exports.getOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let orders;
    let total;

    if (status === 'pending') {
      orders = await Order.getPendingOrders();
      total = orders.length;
    } else {
      orders = await Order.getAll(parseInt(limit), parseInt(offset));
      total = await Order.getTotalCount();
    }

    res.json({
      success: true,
      orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'خطا در دریافت سفارشات.' });
  }
};

// ---------- تغییر وضعیت سفارش (تأیید/رد) ----------
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, adminNote } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({ error: 'اطلاعات کامل نیست.' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'سفارش یافت نشد.' });
    }

    await Order.updateStatus(orderId, status, adminNote || null);

    // اگر سفارش تأیید شد، اشتراک را فعال کن
    if (status === 'approved') {
      const planDetails = await Subscription.getPlanDetails(order.plan_type);
      if (planDetails) {
        // غیرفعال کردن اشتراک قبلی
        await Subscription.deactivateByUserId(order.user_id);

        // ایجاد اشتراک جدید
        await Subscription.create({
          userId: order.user_id,
          planType: order.plan_type,
          maxUsers: planDetails.maxUsers,
          durationDays: planDetails.duration
        });

        // حذف اسکرین‌شات بعد از تأیید (اختیاری)
        const screenshotPath = path.join(__dirname, '../public/uploads/screenshots', order.screenshot);
        if (fs.existsSync(screenshotPath)) {
          fs.removeSync(screenshotPath);
        }
      }
    }

    res.json({
      success: true,
      message: `وضعیت سفارش به ${status === 'approved' ? 'تأیید شده' : 'رد شده'} تغییر یافت.`
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'خطا در تغییر وضعیت سفارش.' });
  }
};

// ---------- اضافه کردن فیلم/سریال جدید ----------
exports.addMovie = async (req, res) => {
  try {
    const {
      type, title, dubType, genre, imdbRating, year,
      country, ageRating, summary, extraInfo, links
    } = req.body;

    // آپلود پوستر
    const poster = req.file ? req.file.filename : null;

    if (!poster) {
      return res.status(400).json({ error: 'لطفاً پوستر را آپلود کنید.' });
    }

    // ایجاد فیلم در دیتابیس
    const movieId = await Movie.create({
      type,
      title,
      poster,
      dubType,
      genre,
      imdbRating,
      year,
      country,
      ageRating,
      summary,
      extraInfo
    });

    // اضافه کردن لینک‌ها
    if (links && Array.isArray(links)) {
      for (const link of links) {
        await MovieLink.create({
          movieId,
          episodeNumber: link.episodeNumber || 0,
          link: link.url
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'فیلم/سریال با موفقیت اضافه شد.',
      movieId
    });

  } catch (error) {
    console.error('Add movie error:', error);
    res.status(500).json({ error: 'خطا در اضافه کردن فیلم/سریال.' });
  }
};

// ---------- حذف فیلم/سریال ----------
exports.deleteMovie = async (req, res) => {
  try {
    const { id } = req.params;

    const movie = await Movie.findById(id);
    if (!movie) {
      return res.status(404).json({ error: 'فیلم/سریال یافت نشد.' });
    }

    // حذف پوستر
    const posterPath = path.join(__dirname, '../public/uploads/posters', movie.poster);
    if (fs.existsSync(posterPath)) {
      fs.removeSync(posterPath);
    }

    await Movie.delete(id);

    res.json({
      success: true,
      message: 'فیلم/سریال با موفقیت حذف شد.'
    });

  } catch (error) {
    console.error('Delete movie error:', error);
    res.status(500).json({ error: 'خطا در حذف فیلم/سریال.' });
  }
};
