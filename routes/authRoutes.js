const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const { 
  registerUser, 
  loginUser, 
  getMe, 
  updateProfileFromPdf 
} = require('../controllers/authController');

// Configure Multer for temporary file storage
const upload = multer({ dest: 'uploads/' });

// Existing Authentication Routes
router.post('/', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

// New Route: Update Profile via PDF Upload
// 'profilePdf' must match the key used in the frontend FormData
router.put('/profile/upload-pdf', protect, upload.single('profilePdf'), updateProfileFromPdf);

module.exports = router;