const { promisePool } = require('../utils/db');
const bcrypt = require('bcryptjs');

class User {
  static async create({ username, email, password, telegramId, displayName }) {
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    const [result] = await promisePool.query(
      `INSERT INTO users (username, email, password, telegram_id, display_name) 
       VALUES (?, ?, ?, ?, ?)`,
      [username, email || null, hashedPassword, telegramId || null, displayName || username]
    );
    return result.insertId;
  }

  static async findByEmail(email) {
    const [rows] = await promisePool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  }

  static async findByTelegramId(telegramId) {
    const [rows] = await promisePool.query(
      'SELECT * FROM users WHERE telegram_id = ?',
      [telegramId]
    );
    return rows[0] || null;
  }

  static async findById(id) {
    const [rows] = await promisePool.query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  static async findByUsername(username) {
    const [rows] = await promisePool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return rows[0] || null;
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    values.push(id);
    await promisePool.query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );
  }

  static async verifyPassword(user, password) {
    if (!user.password) return false;
    return await bcrypt.compare(password, user.password);
  }

  static async getAll(limit = 100, offset = 0) {
    const [rows] = await promisePool.query(
      'SELECT id, username, email, display_name, role, is_banned, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    return rows;
  }

  static async getTotalCount() {
    const [rows] = await promisePool.query('SELECT COUNT(*) as count FROM users');
    return rows[0].count;
  }

  static async ban(id, reason) {
    await promisePool.query(
      'UPDATE users SET is_banned = true, ban_reason = ? WHERE id = ?',
      [reason, id]
    );
  }

  static async unban(id) {
    await promisePool.query(
      'UPDATE users SET is_banned = false, ban_reason = NULL WHERE id = ?',
      [id]
    );
  }
}

module.exports = User;
