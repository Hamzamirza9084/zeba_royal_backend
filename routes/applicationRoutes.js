const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  applyToUniversity,
  getMyApplications,
  getAllApplications,
  updateApplicationStatus,
} = require('../controllers/applicationController');

router.post('/', protect, applyToUniversity);
router.get('/my', protect, getMyApplications);
router.get('/', protect, admin, getAllApplications);
router.put('/:id', protect, admin, updateApplicationStatus);

module.exports = router;
