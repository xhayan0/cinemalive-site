const { promisePool } = require('../utils/db');

class MovieLink {
  static async create({ movieId, episodeNumber, link }) {
    const [result] = await promisePool.query(
      'INSERT INTO movie_links (movie_id, episode_number, link, created_at) VALUES (?, ?, ?, NOW())',
      [movieId, episodeNumber || 0, link]
    );
    return result.insertId;
  }

  static async findByMovieId(movieId) {
    const [rows] = await promisePool.query(
      'SELECT * FROM movie_links WHERE movie_id = ? ORDER BY episode_number ASC',
      [movieId]
    );
    return rows;
  }

  static async deleteByMovieId(movieId) {
    await promisePool.query('DELETE FROM movie_links WHERE movie_id = ?', [movieId]);
  }

  static async delete(id) {
    await promisePool.query('DELETE FROM movie_links WHERE id = ?', [id]);
  }
}

module.exports = MovieLink;
