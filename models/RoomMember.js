const { promisePool } = require('../utils/db');

class RoomMember {
  static async add({ roomId, userId, isOwner = false }) {
    const [result] = await promisePool.query(
      `INSERT INTO room_members (room_id, user_id, is_owner, joined_at) 
       VALUES (?, ?, ?, NOW())`,
      [roomId, userId, isOwner]
    );
    return result.insertId;
  }

  static async remove(roomId, userId) {
    await promisePool.query(
      'DELETE FROM room_members WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );
  }

  static async isMember(roomId, userId) {
    const [rows] = await promisePool.query(
      'SELECT * FROM room_members WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );
    return rows.length > 0;
  }

  static async isOwner(roomId, userId) {
    const [rows] = await promisePool.query(
      'SELECT * FROM room_members WHERE room_id = ? AND user_id = ? AND is_owner = true',
      [roomId, userId]
    );
    return rows.length > 0;
  }

  static async mute(roomId, userId) {
    await promisePool.query(
      'UPDATE room_members SET is_muted = true WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );
  }

  static async unmute(roomId, userId) {
    await promisePool.query(
      'UPDATE room_members SET is_muted = false WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );
  }

  static async isMuted(roomId, userId) {
    const [rows] = await promisePool.query(
      'SELECT is_muted FROM room_members WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );
    return rows.length > 0 && rows[0].is_muted;
  }

  static async getAllMembers(roomId) {
    const [rows] = await promisePool.query(
      `SELECT u.id, u.username, u.display_name, u.avatar, rm.is_owner, rm.is_muted 
       FROM room_members rm 
       JOIN users u ON rm.user_id = u.id 
       WHERE rm.room_id = ?`,
      [roomId]
    );
    return rows;
  }
}

module.exports = RoomMember;
