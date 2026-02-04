const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');
const { errorHandler } = require('../middleware/errorMiddleware');

// Wrap controller in try/catch or use express-async-handler
// For simplicity, we are using the raw controller here, ensure you handle async errors in production
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.post('/register', asyncHandler(registerUser));
router.post('/login', asyncHandler(loginUser));

module.exports = router;