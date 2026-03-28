const { cloudinary } = require('./cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Reusing existing configured cloudinary instance from environment
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'zeba_royal_logos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
    public_id: (req, file) => `logo-${Date.now()}-${Math.round(Math.random() * 1e9)}`
  }
});

module.exports = { storage };
