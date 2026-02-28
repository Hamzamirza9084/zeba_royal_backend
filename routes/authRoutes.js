const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect, admin } = require('../middleware/authMiddleware');
const { 
  registerUser, 
  loginUser, 
  getMe,
  updateProfile,
  getStudents,
  getStudentById
} = require('../controllers/authController');

// Configure Multer for temporary file storage (accept only PDFs)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only PDFs
  if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') {
    cb(null, true);
  } else {
    cb(null, false);
    cb(new Error('Only PDF files are allowed'));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Existing Authentication Routes
router.post('/', registerUser);
router.post('/login', loginUser);
router.post('/register', registerUser);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

// Document upload
router.post('/documents', protect, upload.single('file'), require('../controllers/authController').uploadDocument);
router.delete('/documents', protect, require('../controllers/authController').deleteDocument);
router.get('/documents/view/:filename', protect, require('../controllers/authController').viewDocument);

// Admin Routes
router.get('/students', protect, admin, getStudents);
router.get('/students/:id', protect, admin, getStudentById);

module.exports = router;