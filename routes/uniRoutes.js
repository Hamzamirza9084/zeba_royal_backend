const express = require('express');
const router = express.Router();
const {
    getUniversities,
    setUniversity,
    getUniversityById,
    updateUniversity,
    deleteUniversity
} = require('../controllers/uniController');
const { protect, admin } = require('../middleware/authMiddleware');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Public route to see colleges
router.get('/', asyncHandler(getUniversities));

// Protected Admin route to add colleges
router.post('/', protect, admin, asyncHandler(setUniversity));

// Single University Routes
router.route('/:id')
    .get(asyncHandler(getUniversityById)) // Public or protected depending on your needs. Assuming public to view details.
    .put(protect, admin, asyncHandler(updateUniversity))
    .delete(protect, admin, asyncHandler(deleteUniversity));

module.exports = router;