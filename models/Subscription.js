const { promisePool } = require('../utils/db');

class Subscription {
  static async create({ userId, planType, maxUsers, durationDays }) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);
    
    const [result] = await promisePool.query(
      `INSERT INTO subscriptions (user_id, plan_type, max_users, duration_days, start_date, end_date, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, planType, maxUsers, durationDays, startDate, endDate, true]
    );
    return result.insertId;
  }

  static async findActiveByUserId(userId) {
    const [rows] = await promisePool.query(
      `SELECT * FROM subscriptions 
       WHERE user_id = ? AND is_active = true AND end_date > NOW()
       ORDER BY end_date ASC LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  }

  static async deactivate(id) {
    await promisePool.query(
      'UPDATE subscriptions SET is_active = false WHERE id = ?',
      [id]
    );
  }

  static async extend(userId, newPlan, durationDays) {
    // غیرفعال کردن اشتراک قبلی
    await this.deactivateByUserId(userId);
    // ایجاد اشتراک جدید
    return await this.create({
      userId,
      planType: newPlan,
      maxUsers: newPlan.includes('2u') ? 2 : 5,
      durationDays
    });
  }

  static async deactivateByUserId(userId) {
    await promisePool.query(
      'UPDATE subscriptions SET is_active = false WHERE user_id = ? AND is_active = true',
      [userId]
    );
  }

  static async getPlanDetails(planType) {
    const plans = {
      '1m_2u': { duration: 31, maxUsers: 2, price: 95000, label: 'یک ماهه - ۲ کاربره' },
      '1m_5u': { duration: 31, maxUsers: 5, price: 175000, label: 'یک ماهه - ۵ کاربره' },
      '3m_2u': { duration: 93, maxUsers: 2, price: 225000, label: 'سه ماهه - ۲ کاربره' },
      '3m_5u': { duration: 93, maxUsers: 5, price: 420000, label: 'سه ماهه - ۵ کاربره' },
      '6m_2u': { duration: 186, maxUsers: 2, price: 399000, label: 'شش ماهه - ۲ کاربره' },
      '6m_5u': { duration: 186, maxUsers: 5, price: 735000, label: 'شش ماهه - ۵ کاربره' },
      '1y_2u': { duration: 366, maxUsers: 2, price: 685000, label: 'یک ساله - ۲ کاربره' },
      '1y_5u': { duration: 366, maxUsers: 5, price: 1260000, label: 'یک ساله - ۵ کاربره' }
    };
    return plans[planType] || null;
  }
}

module.exports = Subscription;
