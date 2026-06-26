const { promisePool } = require('../utils/db');

class Room {
  static async create({ ownerId, name, maxUsers, expiresAt }) {
    // تولید کد اتاق ۶ کاراکتری
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const [result] = await promisePool.query(
      `INSERT INTO rooms (room_code, owner_id, name, max_users, expires_at, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [roomCode, ownerId, name, maxUsers, expiresAt]
    );
    return { id: result.insertId, roomCode };
  }

  static async findByCode(roomCode) {
    const [rows] = await promisePool.query(
      `SELECT r.*, u.display_name as owner_name 
       FROM rooms r 
       LEFT JOIN users u ON r.owner_id = u.id 
       WHERE r.room_code = ? AND r.expires_at > NOW()`,
      [roomCode]
    );
    return rows[0] || null;
  }

  static async findByOwner(ownerId) {
    const [rows] = await promisePool.query(
      `SELECT * FROM rooms 
       WHERE owner_id = ? AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [ownerId]
    );
    return rows;
  }

  static async updateVideo(roomId, videoUrl, currentTime = 0, isPlaying = false) {
    await promisePool.query(
      `UPDATE rooms 
       SET current_video = ?, current_time = ?, is_playing = ? 
       WHERE id = ?`,
      [videoUrl, currentTime, isPlaying, roomId]
    );
  }

  static async updateTime(roomId, currentTime) {
    await promisePool.query(
      'UPDATE rooms SET current_time = ? WHERE id = ?',
      [currentTime, roomId]
    );
  }

  static async updatePlaying(roomId, isPlaying) {
    await promisePool.query(
      'UPDATE rooms SET is_playing = ? WHERE id = ?',
      [isPlaying, roomId]
    );
  }

  static async updateName(roomId, name) {
    await promisePool.query(
      'UPDATE rooms SET name = ? WHERE id = ?',
      [name, roomId]
    );
  }

  static async delete(roomId) {
    await promisePool.query('DELETE FROM rooms WHERE id = ?', [roomId]);
  }

  static async getMembers(roomId) {
    const [rows] = await promisePool.query(
      `SELECT u.id, u.username, u.display_name, u.avatar, rm.is_owner, rm.is_muted 
       FROM room_members rm 
       JOIN users u ON rm.user_id = u.id 
       WHERE rm.room_id = ?`,
      [roomId]
    );
    return rows;
  }

  static async getCurrentUsersCount(roomId) {
    const [rows] = await promisePool.query(
      'SELECT COUNT(*) as count FROM room_members WHERE room_id = ?',
      [roomId]
    );
    return rows[0].count;
  }
}

module.exports = Room;
