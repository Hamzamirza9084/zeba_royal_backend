const express = require('express');
const router = express.Router();
const {
    getUniversities,
    setUniversity,
    getUniversityById,
    updateUniversity,
    deleteUniversity,
    uploadLogo
} = require('../controllers/uniController');
const { protect, admin } = require('../middleware/authMiddleware');

const multer = require('multer');
const { storage } = require('../config/cloudinaryImage');
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Public route to see colleges
router.get('/', asyncHandler(getUniversities));

// Protected Admin route to add colleges
router.post('/', protect, admin, asyncHandler(setUniversity));

// Logo upload route
router.post('/upload-logo', protect, admin, upload.single('logo'), asyncHandler(uploadLogo));

// Single University Routes
router.route('/:id')
    .get(asyncHandler(getUniversityById)) // Public or protected depending on your needs. Assuming public to view details.
    .put(protect, admin, asyncHandler(updateUniversity))
    .delete(protect, admin, asyncHandler(deleteUniversity));

module.exports = router;