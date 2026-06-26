const Room = require('../models/Room');
const RoomMember = require('../models/RoomMember');
const JoinRequest = require('../models/JoinRequest');
const BannedUser = require('../models/BannedUser');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { sendTelegramMessage } = require('../utils/telegram');

// ---------- ساخت اتاق جدید ----------
exports.createRoom = async (req, res) => {
  try {
    const userId = req.user.id;

    // بررسی اشتراک فعال
    const subscription = await Subscription.findActiveByUserId(userId);
    if (!subscription) {
      return res.status(403).json({ error: 'برای ساخت اتاق نیاز به اشتراک فعال دارید.' });
    }

    // بررسی وجود اتاق قبلی
    const existingRooms = await Room.findByOwner(userId);
    if (existingRooms.length > 0) {
      return res.status(400).json({ error: 'شما قبلاً یک اتاق دارید.' });
    }

    // محاسبه تاریخ انقضا (با توجه به اشتراک)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + subscription.duration_days);

    // ساخت اتاق
    const room = await Room.create({
      ownerId: userId,
      name: 'اتاق من',
      maxUsers: subscription.max_users,
      expiresAt: expiresAt
    });

    // اضافه کردن خود کاربر به عنوان عضو و مدیر
    await RoomMember.add({
      roomId: room.id,
      userId: userId,
      isOwner: true
    });

    // ارسال نوتیف به ادمین
    await sendTelegramMessage(
      process.env.ADMIN_TELEGRAM_ID,
      `🎉 اتاق جدید ساخته شد!\n👤 کاربر: ${req.user.display_name}\n🔑 کد اتاق: ${room.roomCode}\n📅 انقضا: ${expiresAt.toLocaleDateString('fa-IR')}`
    );

    res.status(201).json({
      success: true,
      message: 'اتاق با موفقیت ساخته شد.',
      room: {
        code: room.roomCode,
        name: 'اتاق من',
        maxUsers: subscription.max_users,
        expiresAt: expiresAt
      }
    });

  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'خطا در ساخت اتاق. لطفاً دوباره تلاش کنید.' });
  }
};

// ---------- دریافت اطلاعات اتاق با کد ----------
exports.getRoomByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const room = await Room.findByCode(code);

    if (!room) {
      return res.status(404).json({ error: 'اتاقی با این کد یافت نشد یا منقضی شده است.' });
    }

    // بررسی عضویت کاربر در اتاق
    const isMember = await RoomMember.isMember(room.id, req.user.id);
    const isOwner = await RoomMember.isOwner(room.id, req.user.id);
    const isBanned = await BannedUser.isBanned(room.id, req.user.id);

    res.json({
      success: true,
      room: {
        id: room.id,
        code: room.room_code,
        name: room.name,
        owner: room.owner_name,
        maxUsers: room.max_users,
        currentUsers: await Room.getCurrentUsersCount(room.id),
        expiresAt: room.expires_at,
        isMember,
        isOwner,
        isBanned,
        currentVideo: room.current_video,
        isPlaying: room.is_playing,
        currentTime: room.current_time
      }
    });

  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'خطا در دریافت اطلاعات اتاق.' });
  }
};

// ---------- دریافت اتاق‌های کاربر ----------
exports.getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.findByOwner(req.user.id);

    // برای هر اتاق، اطلاعات تکمیلی بگیر
    const roomsData = await Promise.all(rooms.map(async (room) => {
      const currentUsers = await Room.getCurrentUsersCount(room.id);
      return {
        id: room.id,
        code: room.room_code,
        name: room.name,
        maxUsers: room.max_users,
        currentUsers: currentUsers,
        expiresAt: room.expires_at,
        createdAt: room.created_at
      };
    }));

    res.json({
      success: true,
      rooms: roomsData
    });

  } catch (error) {
    console.error('Get my rooms error:', error);
    res.status(500).json({ error: 'خطا در دریافت لیست اتاق‌ها.' });
  }
};

// ---------- ویرایش نام اتاق ----------
exports.updateRoomName = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'نام اتاق نمی‌تواند خالی باشد.' });
    }

    // بررسی مالکیت اتاق
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'اتاق یافت نشد.' });
    }

    if (room.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'شما اجازه ویرایش این اتاق را ندارید.' });
    }

    await Room.updateName(roomId, name.trim());

    res.json({
      success: true,
      message: 'نام اتاق با موفقیت تغییر یافت.'
    });

  } catch (error) {
    console.error('Update room name error:', error);
    res.status(500).json({ error: 'خطا در تغییر نام اتاق.' });
  }
};

// ---------- درخواست ورود به اتاق ----------
exports.requestJoin = async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user.id;

    // بررسی بن بودن کاربر
    const room = await Room.findByCode(code);
    if (!room) {
      return res.status(404).json({ error: 'اتاقی با این کد یافت نشد.' });
    }

    // بررسی بن بودن
    const isBanned = await BannedUser.isBanned(room.id, userId);
    if (isBanned) {
      return res.status(403).json({ error: 'شما از این اتاق بن شده‌اید و نمی‌توانید وارد شوید.' });
    }

    // بررسی قبلی بودن درخواست
    const existingRequest = await JoinRequest.findByRoomAndUser(room.id, userId);
    if (existingRequest) {
      return res.status(400).json({ error: 'شما قبلاً درخواست ورود داده‌اید. منتظر تأیید مدیر باشید.' });
    }

    // بررسی پر بودن اتاق
    const currentUsers = await Room.getCurrentUsersCount(room.id);
    if (currentUsers >= room.max_users) {
      return res.status(400).json({ error: 'ظرفیت اتاق تکمیل شده است.' });
    }

    // ثبت درخواست
    await JoinRequest.create({
      roomId: room.id,
      userId: userId
    });

    // ارسال نوتیف به مدیر اتاق (از طریق Socket)
    const io = req.app.get('io');
    io.to(room.room_code).emit('join-request', {
      userId: req.user.id,
      username: req.user.display_name,
      requestedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'درخواست ورود شما ارسال شد. منتظر تأیید مدیر باشید.'
    });

  } catch (error) {
    console.error('Request join error:', error);
    res.status(500).json({ error: 'خطا در ارسال درخواست ورود.' });
  }
};

// ---------- تأیید یا رد درخواست ورود ----------
exports.handleJoinRequest = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { requestId, action } = req.body; // action: 'approve' یا 'reject'

    // بررسی مالکیت اتاق
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'اتاق یافت نشد.' });
    }

    if (room.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'شما اجازه مدیریت این اتاق را ندارید.' });
    }

    // دریافت درخواست
    const request = await JoinRequest.findById(requestId);
    if (!request || request.room_id !== roomId) {
      return res.status(404).json({ error: 'درخواست یافت نشد.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'این درخواست قبلاً بررسی شده است.' });
    }

    if (action === 'approve') {
      // بررسی ظرفیت
      const currentUsers = await Room.getCurrentUsersCount(roomId);
      if (currentUsers >= room.max_users) {
        return res.status(400).json({ error: 'ظرفیت اتاق تکمیل شده است.' });
      }

      // اضافه کردن کاربر به اتاق
      await RoomMember.add({
        roomId: roomId,
        userId: request.user_id,
        isOwner: false
      });

      await JoinRequest.approve(requestId);

      // ارسال نوتیف از طریق Socket
      const io = req.app.get('io');
      io.to(room.room_code).emit('join-approved', {
        userId: request.user_id,
        username: request.display_name
      });

      res.json({
        success: true,
        message: 'کاربر با موفقیت به اتاق اضافه شد.'
      });

    } else if (action === 'reject') {
      await JoinRequest.reject(requestId);

      res.json({
        success: true,
        message: 'درخواست رد شد.'
      });

    } else {
      res.status(400).json({ error: 'عملیات نامعتبر است.' });
    }

  } catch (error) {
    console.error('Handle join request error:', error);
    res.status(500).json({ error: 'خطا در بررسی درخواست.' });
  }
};

// ---------- بن کردن کاربر در اتاق ----------
exports.banUser = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, reason } = req.body;

    // بررسی مالکیت اتاق
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'اتاق یافت نشد.' });
    }

    if (room.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'شما اجازه مدیریت این اتاق را ندارید.' });
    }

    // بررسی اینکه کاربر در اتاق هست
    const isMember = await RoomMember.isMember(roomId, userId);
    if (!isMember) {
      return res.status(400).json({ error: 'این کاربر عضو این اتاق نیست.' });
    }

    // اضافه کردن به لیست بن‌شده‌ها
    await BannedUser.create({
      roomId: roomId,
      userId: userId,
      bannedBy: req.user.id,
      reason: reason || 'بدون دلیل'
    });

    // حذف کاربر از اتاق
    await RoomMember.remove(roomId, userId);

    // ارسال نوتیف از طریق Socket
    const io = req.app.get('io');
    io.to(room.room_code).emit('user-banned', {
      userId: userId,
      reason: reason || 'بدون دلیل'
    });

    res.json({
      success: true,
      message: 'کاربر با موفقیت بن شد.'
    });

  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'خطا در بن کردن کاربر.' });
  }
};

// ---------- خارج کردن کاربر از بن ----------
exports.unbanUser = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    // بررسی مالکیت اتاق
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'اتاق یافت نشد.' });
    }

    if (room.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'شما اجازه مدیریت این اتاق را ندارید.' });
    }

    // حذف از لیست بن‌شده‌ها
    await BannedUser.remove(roomId, userId);

    res.json({
      success: true,
      message: 'کاربر از لیست بن خارج شد.'
    });

  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ error: 'خطا در خارج کردن کاربر از بن.' });
  }
};

// ---------- سکوت/رفع سکوت کاربر در اتاق ----------
exports.toggleMute = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    // بررسی مالکیت اتاق
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'اتاق یافت نشد.' });
    }

    if (room.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'شما اجازه مدیریت این اتاق را ندارید.' });
    }

    const isMuted = await RoomMember.isMuted(roomId, userId);
    if (isMuted) {
      await RoomMember.unmute(roomId, userId);
      const io = req.app.get('io');
      io.to(room.room_code).emit('user-unmuted', { userId });
      res.json({ success: true, message: 'سکوت کاربر برداشته شد.' });
    } else {
      await RoomMember.mute(roomId, userId);
      const io = req.app.get('io');
      io.to(room.room_code).emit('user-muted', { userId });
      res.json({ success: true, message: 'کاربر سکوت شد.' });
    }

  } catch (error) {
    console.error('Toggle mute error:', error);
    res.status(500).json({ error: 'خطا در تغییر وضعیت سکوت.' });
  }
};

// ---------- خروج کاربر از اتاق (به‌صورت دستی) ----------
exports.leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // بررسی عضویت
    const isMember = await RoomMember.isMember(roomId, userId);
    if (!isMember) {
      return res.status(400).json({ error: 'شما عضو این اتاق نیستید.' });
    }

    // بررسی اینکه آیا کاربر مدیر است؟
    const isOwner = await RoomMember.isOwner(roomId, userId);
    if (isOwner) {
      return res.status(403).json({ error: 'مدیر اتاق نمی‌تواند از اتاق خارج شود. اگر می‌خواهید اتاق را ببندید، از گزینه حذف استفاده کنید.' });
    }

    // حذف کاربر از اتاق
    await RoomMember.remove(roomId, userId);

    // ارسال نوتیف از طریق Socket
    const io = req.app.get('io');
    const room = await Room.findById(roomId);
    io.to(room.room_code).emit('user-left', { userId });

    res.json({
      success: true,
      message: 'با موفقیت از اتاق خارج شدید.'
    });

  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ error: 'خطا در خروج از اتاق.' });
  }
};

// ---------- دریافت لیست اعضای اتاق ----------
exports.getRoomMembers = async (req, res) => {
  try {
    const { roomId } = req.params;

    // بررسی وجود اتاق
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'اتاق یافت نشد.' });
    }

    const members = await RoomMember.getAllMembers(roomId);
    const bannedUsers = await BannedUser.getBannedUsers(roomId);

    res.json({
      success: true,
      members: members,
      bannedUsers: bannedUsers,
      ownerId: room.owner_id
    });

  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'خطا در دریافت لیست اعضا.' });
  }
};
