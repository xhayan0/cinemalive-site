const { promisePool } = require('../utils/db');

class Order {
  static async create({ userId, planType, screenshot }) {
    const [result] = await promisePool.query(
      `INSERT INTO orders (user_id, plan_type, screenshot, status, created_at) 
       VALUES (?, ?, ?, 'pending', NOW())`,
      [userId, planType, screenshot]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await promisePool.query(
      `SELECT o.*, u.username, u.display_name, u.email 
       FROM orders o 
       JOIN users u ON o.user_id = u.id 
       WHERE o.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async getPendingOrders() {
    const [rows] = await promisePool.query(
      `SELECT o.*, u.username, u.display_name, u.email 
       FROM orders o 
       JOIN users u ON o.user_id = u.id 
       WHERE o.status = 'pending'
       ORDER BY o.created_at ASC`
    );
    return rows;
  }

  static async getAll(limit = 100, offset = 0) {
    const [rows] = await promisePool.query(
      `SELECT o.*, u.username, u.display_name, u.email 
       FROM orders o 
       JOIN users u ON o.user_id = u.id 
       ORDER BY o.created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows;
  }

  static async getTotalCount() {
    const [rows] = await promisePool.query('SELECT COUNT(*) as count FROM orders');
    return rows[0].count;
  }

  static async updateStatus(id, status, adminNote = null) {
    await promisePool.query(
      'UPDATE orders SET status = ?, admin_note = ? WHERE id = ?',
      [status, adminNote, id]
    );
  }

  static async findByUser(userId) {
    const [rows] = await promisePool.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  }
}

module.exports = Order;
