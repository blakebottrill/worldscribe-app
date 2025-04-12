const multer = require('multer');
const path = require('path');
const fs = require('fs');

const mapUploadDir = path.join(__dirname, '../uploads/maps');

// Ensure upload directory exists
if (!fs.existsSync(mapUploadDir)) {
  fs.mkdirSync(mapUploadDir, { recursive: true });
}

// Set up storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, mapUploadDir);
  },
  filename: function (req, file, cb) {
    // Create a unique filename: fieldname-timestamp.extension
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// File filter for specific image types
const fileFilter = (req, file, cb) => {
  // Accept only PNG, JPG/JPEG, and WEBP
  const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Please upload only PNG, JPG, or WEBP images.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 10 // 10MB limit
  },
  fileFilter: fileFilter
});

module.exports = upload; 