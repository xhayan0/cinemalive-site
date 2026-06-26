const cron = require('node-cron');
const fs = require('fs-extra');
const path = require('path');
const { promisePool } = require('./db');

// پاک‌سازی فایل‌های منقضی‌شده (اسکرین‌شات‌های ۷ روزه)
async function cleanupExpiredFiles() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // دریافت سفارشات قدیمی‌تر از ۷ روز که تأیید شده‌اند
    const [orders] = await promisePool.query(
      'SELECT screenshot FROM orders WHERE status = "approved" AND created_at < ?',
      [sevenDaysAgo]
    );

    const uploadsDir = path.join(__dirname, '../public/uploads/screenshots');
    for (const order of orders) {
      const filePath = path.join(uploadsDir, order.screenshot);
      if (fs.existsSync(filePath)) {
        fs.removeSync(filePath);
        console.log(`🗑️ فایل ${order.screenshot} پاک شد.`);
      }
    }

  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// اجرای کرون‌جاب هر روز ساعت ۲ بامداد
cron.schedule('0 2 * * *', () => {
  console.log('🔄 اجرای پاک‌سازی خودکار فایل‌ها...');
  cleanupExpiredFiles();
});

module.exports = { cleanupExpiredFiles };
