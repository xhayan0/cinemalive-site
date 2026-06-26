const { promisePool } = require('../utils/db');

class BannedUser {
  static async create({ roomId, userId, bannedBy, reason }) {
    const [result] = await promisePool.query(
      `INSERT INTO banned_users (room_id, user_id, banned_by, reason, banned_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      [roomId, userId, bannedBy, reason]
    );
    return result.insertId;
  }

  static async isBanned(roomId, userId) {
    const [rows] = await promisePool.query(
      'SELECT * FROM banned_users WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );
    return rows.length > 0;
  }

  static async remove(roomId, userId) {
    await promisePool.query(
      'DELETE FROM banned_users WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );
  }

  static async getBannedUsers(roomId) {
    const [rows] = await promisePool.query(
      `SELECT bu.*, u.username, u.display_name 
       FROM banned_users bu 
       JOIN users u ON bu.user_id = u.id 
       WHERE bu.room_id = ?`,
      [roomId]
    );
    return rows;
  }

  static async getByUser(userId) {
    const [rows] = await promisePool.query(
      `SELECT bu.*, u.username as banned_by_name 
       FROM banned_users bu 
       JOIN users u ON bu.banned_by = u.id 
       WHERE bu.user_id = ?`,
      [userId]
    );
    return rows;
  }
}

module.exports = BannedUser;
