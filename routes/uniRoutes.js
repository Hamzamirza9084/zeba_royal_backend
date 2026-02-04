const express = require('express');
const router = express.Router();
const { getUniversities, setUniversity } = require('../controllers/uniController');
const { protect, admin } = require('../middleware/authMiddleware');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Public route to see colleges
router.get('/', asyncHandler(getUniversities));

// Protected Admin route to add colleges
router.post('/', protect, admin, asyncHandler(setUniversity));

module.exports = router;