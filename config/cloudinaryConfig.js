const cloudinary = require('cloudinary').v2;
const multer = require('multer');
require('dotenv').config();
// const { Storage } = require('@google-cloud/storage');

// Initialize Cloudinary
console.log('Cloudinary Config:', {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not Set',
  apiKey: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not Set',
  apiSecret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not Set'
});


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup for handling image files
const storage = multer.memoryStorage(); // Store files in memory

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload an image.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

module.exports = {
  upload,
  cloudinary
};