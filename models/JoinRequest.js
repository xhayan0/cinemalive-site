const { promisePool } = require('../utils/db');

class JoinRequest {
  static async create({ roomId, userId }) {
    const [result] = await promisePool.query(
      `INSERT INTO join_requests (room_id, user_id, status, requested_at) 
       VALUES (?, ?, 'pending', NOW())`,
      [roomId, userId]
    );
    return result.insertId;
  }

  static async findByRoomAndUser(roomId, userId) {
    const [rows] = await promisePool.query(
      `SELECT * FROM join_requests 
       WHERE room_id = ? AND user_id = ? AND status = 'pending'
       ORDER BY requested_at DESC LIMIT 1`,
      [roomId, userId]
    );
    return rows[0] || null;
  }

  static async getPendingRequests(roomId) {
    const [rows] = await promisePool.query(
      `SELECT jr.*, u.username, u.display_name 
       FROM join_requests jr 
       JOIN users u ON jr.user_id = u.id 
       WHERE jr.room_id = ? AND jr.status = 'pending'
       ORDER BY jr.requested_at ASC`,
      [roomId]
    );
    return rows;
  }

  static async approve(id) {
    await promisePool.query(
      'UPDATE join_requests SET status = "approved" WHERE id = ?',
      [id]
    );
  }

  static async reject(id) {
    await promisePool.query(
      'UPDATE join_requests SET status = "rejected" WHERE id = ?',
      [id]
    );
  }

  static async deleteByRoomAndUser(roomId, userId) {
    await promisePool.query(
      'DELETE FROM join_requests WHERE room_id = ? AND user_id = ? AND status = "pending"',
      [roomId, userId]
    );
  }
}

module.exports = JoinRequest;
