const { promisePool } = require('./utils/db');

module.exports = (io, pool) => {
  const rooms = {};

  io.on('connection', (socket) => {
    console.log('🔗 کاربر متصل شد:', socket.id);

    // ---- رویدادهای اتاق ----
    socket.on('join-room', async ({ roomId, userId, username }) => {
      // بررسی وجود اتاق و اعتبار کاربر
      try {
        const [roomRows] = await promisePool.query(
          'SELECT * FROM rooms WHERE room_code = ? AND expires_at > NOW()',
          [roomId]
        );
        if (roomRows.length === 0) {
          socket.emit('error', 'اتاق معتبر نیست یا منقضی شده است.');
          return;
        }
        const room = roomRows[0];

        // بررسی ظرفیت
        const [memberRows] = await promisePool.query(
          'SELECT COUNT(*) as count FROM room_members WHERE room_id = ?',
          [room.id]
        );
        if (memberRows[0].count >= room.max_users) {
          socket.emit('error', 'ظرفیت اتاق تکمیل شده است.');
          return;
        }

        // اضافه کردن کاربر به اتاق
        await promisePool.query(
          'INSERT INTO room_members (room_id, user_id, is_owner, joined_at) VALUES (?, ?, ?, NOW())',
          [room.id, userId, userId === room.owner_id]
        );

        socket.join(roomId);
        socket.roomId = roomId;
        socket.userId = userId;
        socket.username = username;

        // ارسال وضعیت فعلی اتاق
        socket.emit('room-state', {
          videoUrl: room.current_video,
          currentTime: room.current_time,
          isPlaying: room.is_playing,
          users: [] // بعداً لیست کاربران رو ارسال می‌کنیم
        });

        // اطلاع‌رسانی به سایر کاربران
        io.to(roomId).emit('user-joined', { userId, username });

        console.log(`👤 کاربر ${username} به اتاق ${roomId} پیوست`);

      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', 'خطا در ورود به اتاق');
      }
    });

    // ---- کنترل پخش (پلی، استپ، سیك) ----
    socket.on('play', ({ roomId, time }) => {
      if (!socket.roomId || socket.roomId !== roomId) return;
      socket.to(roomId).emit('play', time);
      // ذخیره در دیتابیس (اختیاری)
    });

    socket.on('pause', ({ roomId, time }) => {
      if (!socket.roomId || socket.roomId !== roomId) return;
      socket.to(roomId).emit('pause', time);
    });

    socket.on('seek', ({ roomId, time }) => {
      if (!socket.roomId || socket.roomId !== roomId) return;
      socket.to(roomId).emit('seek', time);
    });

    // ---- چت اتاق ----
    socket.on('chat-message', ({ roomId, username, message, time }) => {
      if (!socket.roomId || socket.roomId !== roomId) return;
      io.to(roomId).emit('chat-message', { username, message, time });
    });

    // ---- ری‌اکشن (ایموجی) ----
    socket.on('reaction', ({ roomId, username, emoji, time }) => {
      if (!socket.roomId || socket.roomId !== roomId) return;
      io.to(roomId).emit('reaction', { username, emoji, time });
    });

    // ---- جدا شدن ----
    socket.on('disconnect', () => {
      if (socket.roomId) {
        io.to(socket.roomId).emit('user-left', { userId: socket.userId });
        // حذف از دیتابیس (اختیاری)
        console.log(`❌ کاربر ${socket.userId} از اتاق ${socket.roomId} خارج شد`);
      }
    });
  });
};