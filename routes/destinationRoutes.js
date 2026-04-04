const express = require('express');
const router = express.Router();
const Destination = require('../models/Destination');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Get all destinations
// @route   GET /api/destinations
// @access  Public
router.get('/', async (req, res) => {
  try {
    const destinations = await Destination.find({}).sort({ name: 1 });
    res.json(destinations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Add a new destination
// @route   POST /api/destinations
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Destination name is required' });
    }

    const destinationExists = await Destination.findOne({ name });
    if (destinationExists) {
      return res.status(400).json({ message: 'Destination already exists' });
    }

    const destination = await Destination.create({ name });
    res.status(201).json(destination);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Toggle destination enabled status
// @route   PUT /api/destinations/:id/toggle
// @access  Private/Admin
router.put('/:id/toggle', protect, admin, async (req, res) => {
  try {
    const destination = await Destination.findById(req.params.id);
    if (!destination) {
      return res.status(404).json({ message: 'Destination not found' });
    }
    destination.enabled = !destination.enabled;
    await destination.save();
    res.json(destination);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
