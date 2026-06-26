const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Room = require('../models/Room');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendTelegramMessage } = require('../utils/telegram');

// Helper: تولید نام کاربری تصادفی
function generateUsername() {
  const adjectives = ['خوش', 'زیبا', 'بزرگ', 'کوچک', 'سریع', 'آرام', 'شاد', 'باهوش', 'مهربان', 'قشنگ'];
  const nouns = ['ستاره', 'ماه', 'خورشید', 'دل', 'جان', 'عشق', 'دوست', 'یار', 'سینما', 'فیلم'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}${noun}${num}`;
}

// Helper: تولید کد تأیید ۶ رقمی
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ---------- ثبت‌نام با ایمیل ----------
exports.registerWithEmail = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    // اعتبارسنجی
    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'همه فیلدها الزامی هستند.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'رمز عبور و تکرار آن مطابقت ندارند.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد.' });
    }

    // بررسی تکراری نبودن ایمیل
    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'این ایمیل قبلاً ثبت شده است.' });
    }

    // تولید نام کاربری
    let username = generateUsername();
    while (await User.findByUsername(username)) {
      username = generateUsername();
    }

    // ایجاد کاربر
    const userId = await User.create({
      username,
      email,
      password,
      displayName: username
    });

    // ایجاد نشست
    req.session.userId = userId;
    req.session.save();

    res.status(201).json({
      success: true,
      message: 'ثبت‌نام با موفقیت انجام شد.',
      user: { id: userId, username, email }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'خطا در ثبت‌نام. لطفاً دوباره تلاش کنید.' });
  }
};

// ---------- ورود با ایمیل ----------
exports.loginWithEmail = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'ایمیل و رمز عبور الزامی هستند.' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است.' });
    }

    if (user.is_banned) {
      return res.status(403).json({ error: `حساب کاربری شما مسدود شده است. دلیل: ${user.ban_reason || 'نامشخص'}` });
    }

    const isValid = await User.verifyPassword(user, password);
    if (!isValid) {
      return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است.' });
    }

    // ایجاد نشست
    req.session.userId = user.id;
    req.session.save();

    res.json({
      success: true,
      message: 'ورود با موفقیت انجام شد.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        avatar: user.avatar,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'خطا در ورود. لطفاً دوباره تلاش کنید.' });
  }
};

// ---------- ورود خودکار از طریق تلگرام (WebApp) ----------
exports.loginWithTelegram = async (req, res) => {
  try {
    const { telegramId, username, firstName, lastName } = req.body;

    if (!telegramId) {
      return res.status(400).json({ error: 'اطلاعات تلگرام دریافت نشد.' });
    }

    // جستجوی کاربر
    let user = await User.findByTelegramId(telegramId);

    if (!user) {
      // ثبت‌نام خودکار
      const displayName = firstName + (lastName ? ' ' + lastName : '');
      let uname = username || generateUsername();
      while (await User.findByUsername(uname)) {
        uname = generateUsername();
      }

      const userId = await User.create({
        username: uname,
        telegramId: telegramId,
        displayName: displayName || uname
      });

      user = await User.findById(userId);

      // فعال‌سازی ۷ روز اشتراک رایگان
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await Subscription.create({
        userId: user.id,
        planType: 'trial',
        maxUsers: 2,
        durationDays: 7
      });

      // ساخت اتاق
      const roomExpiry = new Date();
      roomExpiry.setDate(roomExpiry.getDate() + 7);
      await Room.create({
        ownerId: user.id,
        name: 'اتاق من',
        maxUsers: 2,
        expiresAt: roomExpiry
      });

      // ارسال نوتیف به ادمین
      await sendTelegramMessage(
        process.env.ADMIN_TELEGRAM_ID,
        `🎉 کاربر جدید از طریق تلگرام ثبت‌نام کرد!\n👤 نام: ${displayName}\n🆔 آیدی: ${telegramId}\n📅 تاریخ: ${new Date().toLocaleDateString('fa-IR')}`
      );
    }

    if (user.is_banned) {
      return res.status(403).json({ error: `حساب کاربری شما مسدود شده است. دلیل: ${user.ban_reason || 'نامشخص'}` });
    }

    // ایجاد نشست
    req.session.userId = user.id;
    req.session.save();

    res.json({
      success: true,
      message: 'ورود با تلگرام انجام شد.',
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Telegram login error:', error);
    res.status(500).json({ error: 'خطا در ورود با تلگرام. لطفاً دوباره تلاش کنید.' });
  }
};

// ---------- خروج ----------
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'خطا در خروج از حساب.' });
    }
    res.json({ success: true, message: 'با موفقیت خارج شدید.' });
  });
};

// ---------- دریافت اطلاعات کاربر جاری ----------
exports.getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'وارد حساب کاربری خود نشده‌اید.' });
    }

    // دریافت اشتراک فعال
    const subscription = await Subscription.findActiveByUserId(req.user.id);

    // دریافت اتاق
    const rooms = await Room.findByOwner(req.user.id);
    const room = rooms.length > 0 ? rooms[0] : null;

    res.json({
      success: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        displayName: req.user.display_name,
        avatar: req.user.avatar,
        role: req.user.role,
        isBanned: req.user.is_banned
      },
      subscription: subscription ? {
        planType: subscription.plan_type,
        maxUsers: subscription.max_users,
        endDate: subscription.end_date,
        daysLeft: Math.max(0, Math.ceil((new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24)))
      } : null,
      room: room ? {
        code: room.room_code,
        name: room.name,
        maxUsers: room.max_users,
        expiresAt: room.expires_at
      } : null
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'خطا در دریافت اطلاعات کاربر.' });
  }
};

// ---------- فراموشی رمز عبور (ارسال کد به ایمیل) ----------
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'ایمیل خود را وارد کنید.' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'کاربری با این ایمیل یافت نشد.' });
    }

    // تولید کد OTP
    const otp = generateOTP();
    const otpExpiry = Date.now() + 15 * 60 * 1000; // ۱۵ دقیقه

    // ذخیره کد در سشن (یا دیتابیس)
    req.session.resetOtp = {
      email: email,
      otp: otp,
      expiry: otpExpiry
    };
    req.session.save();

    // ارسال کد به ایمیل (با استفاده از سرویس SMTP داخلی)
    // برای این کار، از کتابخانه `nodemailer` استفاده میکنیم
    const transporter = require('../utils/email');
    await transporter.sendMail({
      to: email,
      subject: 'کد بازنشانی رمز عبور - سینما لایو',
      html: `
        <h2>🔐 کد بازنشانی رمز عبور</h2>
        <p>کد زیر را برای بازنشانی رمز عبور خود وارد کنید:</p>
        <h1 style="color: #f0b90b;">${otp}</h1>
        <p>این کد تا ۱۵ دقیقه معتبر است.</p>
        <p>اگر درخواست بازنشانی ندادید، این پیام را نادیده بگیرید.</p>
      `
    });

    res.json({ success: true, message: 'کد بازنشانی به ایمیل شما ارسال شد.' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'خطا در ارسال کد بازنشانی. لطفاً دوباره تلاش کنید.' });
  }
};

// ---------- تأیید کد OTP و بازنشانی رمز ----------
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'همه فیلدها الزامی هستند.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'رمز عبور و تکرار آن مطابقت ندارند.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد.' });
    }

    // بررسی کد ذخیره‌شده در سشن
    const resetData = req.session.resetOtp;
    if (!resetData || resetData.email !== email || resetData.otp !== otp) {
      return res.status(400).json({ error: 'کد نامعتبر است.' });
    }

    if (Date.now() > resetData.expiry) {
      return res.status(400).json({ error: 'کد منقضی شده است. دوباره تلاش کنید.' });
    }

    // هش کردن رمز جدید
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.update(email, { password: hashedPassword });

    // پاک کردن کد از سشن
    delete req.session.resetOtp;
    req.session.save();

    // لاگین خودکار
    const user = await User.findByEmail(email);
    req.session.userId = user.id;
    req.session.save();

    res.json({
      success: true,
      message: 'رمز عبور با موفقیت تغییر یافت و وارد حساب خود شدید.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'خطا در بازنشانی رمز عبور.' });
  }
};

// ---------- اتصال حساب ایمیل به تلگرام ----------
exports.connectTelegram = async (req, res) => {
  try {
    const { userId, telegramId } = req.body;

    if (!userId || !telegramId) {
      return res.status(400).json({ error: 'اطلاعات کامل نیست.' });
    }

    // بررسی اینکه آیا این آیدی تلگرام قبلاً به کاربر دیگری متصل شده
    const existing = await User.findByTelegramId(telegramId);
    if (existing && existing.id !== userId) {
      return res.status(400).json({ error: 'این آیدی تلگرام قبلاً به حساب دیگری متصل شده است.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد.' });
    }

    await User.update(userId, { telegram_id: telegramId });

    // ارسال پیام تأیید به ربات
    await sendTelegramMessage(
      telegramId,
      `✅ حساب کاربری شما با موفقیت به سایت سینما لایو متصل شد.\n👤 نام کاربری: ${user.username}`
    );

    res.json({ success: true, message: 'حساب شما با موفقیت به تلگرام متصل شد.' });

  } catch (error) {
    console.error('Connect telegram error:', error);
    res.status(500).json({ error: 'خطا در اتصال به تلگرام.' });
  }
};

// ---------- ارسال کد OTP برای اتصال تلگرام ----------
exports.sendTelegramOTP = async (req, res) => {
  try {
    const { telegramId } = req.body;

    if (!telegramId) {
      return res.status(400).json({ error: 'آیدی تلگرام را وارد کنید.' });
    }

    // تولید کد OTP
    const otp = generateOTP();
    const otpExpiry = Date.now() + 5 * 60 * 1000; // ۵ دقیقه

    // ذخیره در سشن
    req.session.telegramOtp = {
      telegramId: telegramId,
      otp: otp,
      expiry: otpExpiry
    };
    req.session.save();

    // ارسال کد به کاربر در تلگرام
    await sendTelegramMessage(
      telegramId,
      `🔐 کد تأیید شما: *${otp}*\n\nاین کد را در سایت وارد کنید تا حساب خود را متصل کنید.`
    );

    res.json({ success: true, message: 'کد تأیید به تلگرام شما ارسال شد.' });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'خطا در ارسال کد تأیید.' });
  }
};

// ---------- تأیید کد OTP تلگرام ----------
exports.verifyTelegramOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ error: 'اطلاعات کامل نیست.' });
    }

    const otpData = req.session.telegramOtp;
    if (!otpData || otpData.otp !== otp) {
      return res.status(400).json({ error: 'کد نامعتبر است.' });
    }

    if (Date.now() > otpData.expiry) {
      return res.status(400).json({ error: 'کد منقضی شده است. دوباره تلاش کنید.' });
    }

    // اتصال حساب
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد.' });
    }

    await User.update(userId, { telegram_id: otpData.telegramId });

    // ارسال پیام تأیید
    await sendTelegramMessage(
      otpData.telegramId,
      `✅ حساب کاربری شما با موفقیت به سایت سینما لایو متصل شد.\n👤 نام کاربری: ${user.username}`
    );

    // پاک کردن OTP از سشن
    delete req.session.telegramOtp;
    req.session.save();

    res.json({ success: true, message: 'حساب شما با موفقیت به تلگرام متصل شد.' });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'خطا در تأیید کد.' });
  }
};
