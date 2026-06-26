const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { sendTelegramMessage } = require('../utils/telegram');
const fs = require('fs-extra');
const path = require('path');

// ---------- ثبت سفارش جدید ----------
exports.createOrder = async (req, res) => {
  try {
    const { planType } = req.body;
    const userId = req.user.id;

    if (!planType) {
      return res.status(400).json({ error: 'نوع پلن را انتخاب کنید.' });
    }

    // بررسی معتبر بودن پلن
    const planDetails = await Subscription.getPlanDetails(planType);
    if (!planDetails) {
      return res.status(400).json({ error: 'پلن نامعتبر است.' });
    }

    // آپلود اسکرین‌شات
    const screenshot = req.file ? req.file.filename : null;
    if (!screenshot) {
      return res.status(400).json({ error: 'لطفاً اسکرین‌شات واریز را آپلود کنید.' });
    }

    // ثبت سفارش
    const orderId = await Order.create({
      userId,
      planType,
      screenshot
    });

    // ارسال نوتیف به ادمین
    await sendTelegramMessage(
      process.env.ADMIN_TELEGRAM_ID,
      `🛒 سفارش جدید!\n👤 کاربر: ${req.user.display_name}\n📦 پلن: ${planDetails.label}\n💰 قیمت: ${planDetails.price.toLocaleString()} تومان\n🆔 شماره سفارش: ${orderId}\n📅 تاریخ: ${new Date().toLocaleDateString('fa-IR')}`
    );

    res.status(201).json({
      success: true,
      message: 'سفارش شما ثبت شد. پس از تأیید ادمین، اشتراک شما فعال می‌شود.',
      orderId
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'خطا در ثبت سفارش.' });
  }
};

// ---------- دریافت سفارشات کاربر ----------
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.findByUser(req.user.id);

    res.json({
      success: true,
      orders: orders
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'خطا در دریافت سفارشات.' });
  }
};
