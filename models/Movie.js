const { promisePool } = require('../utils/db');

class Movie {
  static async create(data) {
    const { type, title, poster, dubType, genre, imdbRating, year, country, ageRating, summary, extraInfo } = data;
    const [result] = await promisePool.query(
      `INSERT INTO movies (type, title, poster, dub_type, genre, imdb_rating, year, country, age_rating, summary, extra_info, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [type, title, poster, dubType, genre, imdbRating || null, year || null, country, ageRating, summary, extraInfo || null]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await promisePool.query(
      'SELECT * FROM movies WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  static async getAll(filters = {}) {
    let query = 'SELECT * FROM movies WHERE 1=1';
    const values = [];

    if (filters.type) {
      query += ' AND type = ?';
      values.push(filters.type);
    }
    if (filters.genre) {
      query += ' AND genre LIKE ?';
      values.push(`%${filters.genre}%`);
    }
    if (filters.country) {
      query += ' AND country = ?';
      values.push(filters.country);
    }
    if (filters.dubType) {
      query += ' AND dub_type = ?';
      values.push(filters.dubType);
    }
    if (filters.search) {
      query += ' AND title LIKE ?';
      values.push(`%${filters.search}%`);
    }

    query += ' ORDER BY created_at DESC';
    
    if (filters.limit) {
      query += ' LIMIT ?';
      values.push(filters.limit);
      if (filters.offset) {
        query += ' OFFSET ?';
        values.push(filters.offset);
      }
    }

    const [rows] = await promisePool.query(query, values);
    return rows;
  }

  static async getTotalCount(filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM movies WHERE 1=1';
    const values = [];

    if (filters.type) {
      query += ' AND type = ?';
      values.push(filters.type);
    }
    if (filters.genre) {
      query += ' AND genre LIKE ?';
      values.push(`%${filters.genre}%`);
    }
    if (filters.country) {
      query += ' AND country = ?';
      values.push(filters.country);
    }
    if (filters.dubType) {
      query += ' AND dub_type = ?';
      values.push(filters.dubType);
    }
    if (filters.search) {
      query += ' AND title LIKE ?';
      values.push(`%${filters.search}%`);
    }

    const [rows] = await promisePool.query(query, values);
    return rows[0].count;
  }

  static async delete(id) {
    // ابتدا لینک‌های مرتبط رو حذف کن
    await promisePool.query('DELETE FROM movie_links WHERE movie_id = ?', [id]);
    await promisePool.query('DELETE FROM movies WHERE id = ?', [id]);
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
      `UPDATE movies SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }
}

module.exports = Movie;
