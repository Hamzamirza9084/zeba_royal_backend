const express = require('express');
const router = express.Router();
const Destination = require('../models/Destination');
const Institution = require('../models/Institution');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Get all destinations
// @route   GET /api/destinations
// @access  Public
router.get('/', async (req, res) => {
  try {
    const destinations = await Destination.find({}).sort({ name: 1 }).lean();

    if (req.query.withCounts === 'true') {
      const counts = await Institution.aggregate([
        { $group: { _id: '$destinationId', count: { $sum: 1 } } }
      ]);
      const countMap = {};
      counts.forEach(c => {
        if (c._id) countMap[c._id.toString()] = c.count;
      });
      destinations.forEach(d => {
        d.institutionCount = countMap[d._id.toString()] || 0;
      });
    }

    res.json(destinations);
  } catch (error) {
    console.error('getDestinations error:', error);
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

    const trimmedName = name.trim().replace(/\s+/g, ' ');
    const escName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const destinationExists = await Destination.findOne({ 
      name: { $regex: new RegExp(`^${escName}$`, 'i') } 
    });
    if (destinationExists) {
      return res.status(400).json({ message: `"${trimmedName}" is already there!` });
    }

    const destination = await Destination.create({ name: trimmedName });
    res.status(201).json(destination);
  } catch (error) {
    console.error('addDestination error:', error);
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
    console.error('toggleDestination error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Delete a destination
// @route   DELETE /api/destinations/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const destination = await Destination.findById(req.params.id);
    if (!destination) {
      return res.status(404).json({ message: 'Destination not found' });
    }

    const instCount = await Institution.countDocuments({ destinationId: req.params.id });
    if (instCount > 0 && req.query.force !== 'true') {
      return res.status(400).json({ 
        message: `Cannot delete: ${instCount} institution(s) belong to ${destination.name}. Please remove or reassign them first.` 
      });
    }

    await destination.deleteOne();
    res.json({ message: 'Destination deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('deleteDestination error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
