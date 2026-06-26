const Movie = require('../models/Movie');
const MovieLink = require('../models/MovieLink');

// ---------- دریافت لیست فیلم‌ها با فیلتر ----------
exports.getMovies = async (req, res) => {
  try {
    const { 
      type, 
      genre, 
      country, 
      dubType, 
      search, 
      page = 1, 
      limit = 10 
    } = req.query;

    const filters = { type, genre, country, dubType, search };
    const offset = (page - 1) * limit;

    const movies = await Movie.getAll({
      ...filters,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await Movie.getTotalCount(filters);

    // دریافت لینک‌ها برای هر فیلم
    const moviesWithLinks = await Promise.all(movies.map(async (movie) => {
      const links = await MovieLink.findByMovieId(movie.id);
      return {
        ...movie,
        links: links
      };
    }));

    res.json({
      success: true,
      movies: moviesWithLinks,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get movies error:', error);
    res.status(500).json({ error: 'خطا در دریافت لیست فیلم‌ها.' });
  }
};

// ---------- دریافت اطلاعات یک فیلم ----------
exports.getMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const movie = await Movie.findById(id);

    if (!movie) {
      return res.status(404).json({ error: 'فیلم یا سریال یافت نشد.' });
    }

    const links = await MovieLink.findByMovieId(id);

    res.json({
      success: true,
      movie: {
        ...movie,
        links: links
      }
    });

  } catch (error) {
    console.error('Get movie error:', error);
    res.status(500).json({ error: 'خطا در دریافت اطلاعات فیلم.' });
  }
};
