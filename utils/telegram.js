const axios = require('axios');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SITE_URL = process.env.SITE_URL;

async function sendTelegramMessage(chatId, text, keyboard = null) {
  try {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    };

    if (keyboard) {
      payload.reply_markup = keyboard;
    }

    const response = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      payload
    );
    return response.data;
  } catch (error) {
    console.error('Telegram API error:', error.response?.data || error.message);
    throw error;
  }
}

// ارسال پیام به همه کاربران ربات (برای اطلاع‌رسانی)
async function broadcastToAllUsers(message) {
  // این تابع باید از دیتابیس لیست کاربران را بگیرد و برای همه پیام بفرستد
  // فعلاً فقط به ادمین ارسال میکنیم
  await sendTelegramMessage(process.env.ADMIN_TELEGRAM_ID, message);
}

// کیبوردهای آماده
function getMainKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🎬 ورود به مینی‌اپ', web_app: { url: SITE_URL } }],
      [
        { text: '📺 فیلم و سریال‌ها', callback_data: 'movies' },
        { text: '🏠 اتاق‌های من', callback_data: 'my_rooms' }
      ],
      [
        { text: '🔗 پیوستن به اتاق', callback_data: 'join_room' },
        { text: '💰 خرید اشتراک', callback_data: 'buy_subscription' }
      ],
      [
        { text: '📖 راهنما', callback_data: 'help' },
        { text: '💬 چت عمومی', callback_data: 'public_chat' }
      ],
      [{ text: '👥 زیرمجموعه‌گیری', callback_data: 'referral' }]
    ]
  };
}

module.exports = {
  sendTelegramMessage,
  broadcastToAllUsers,
  getMainKeyboard
};
