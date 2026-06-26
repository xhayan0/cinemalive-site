const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

// پوشه‌های آپلود
const uploadDirs = {
  avatars: path.join(__dirname, '../public/uploads/avatars'),
  screenshots: path.join(__dirname, '../public/uploads/screenshots'),
  posters: path.join(__dirname, '../public/uploads/posters'),
};

// ایجاد پوشه‌ها در صورت وجود نداشتن
Object.values(uploadDirs).forEach(dir => {
  fs.ensureDirSync(dir);
});

// تنظیمات ذخیره‌سازی
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = uploadDirs.avatars;
    if (file.fieldname === 'screenshot') folder = uploadDirs.screenshots;
    if (file.fieldname === 'poster') folder = uploadDirs.posters;
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + unique + ext);
  }
});

// فیلتر فایل‌ها (فقط تصاویر)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('فقط فایل‌های تصویری (JPEG, PNG, GIF, WebP) مجاز هستند.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter
});

module.exports = { upload, uploadDirs };
