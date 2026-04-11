const express = require('express');
const router = express.Router();
const Institution = require('../models/Institution');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Get all institutions
// @route   GET /api/institutions
// @access  Public
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.destinationId) {
      filter.destinationId = req.query.destinationId;
    }
    const institutions = await Institution.find(filter).populate('destinationId').sort({ name: 1 });
    res.json(institutions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Add a new institution
// @route   POST /api/institutions
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, destinationId, city, ranking, website, logo, mapLocation } = req.body;
    
    if (!name || !destinationId) {
      return res.status(400).json({ message: 'Institution name and destinationId are required' });
    }

    const institutionExists = await Institution.findOne({ name, destinationId, city });
    if (institutionExists) {
      return res.status(400).json({ message: 'Institution already exists in this destination and city' });
    }

    const institution = await Institution.create({
      name,
      destinationId,
      city,
      ranking,
      website,
      logo,
      mapLocation
    });
    
    res.status(201).json(await institution.populate('destinationId'));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Update an institution
// @route   PUT /api/institutions/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { name, destinationId, city, ranking, website, logo, mapLocation, enabled } = req.body;
    const institution = await Institution.findById(req.params.id);

    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }

    institution.name = name || institution.name;
    institution.destinationId = destinationId || institution.destinationId;
    institution.city = city !== undefined ? city : institution.city;
    institution.ranking = ranking !== undefined ? ranking : institution.ranking;
    institution.website = website !== undefined ? website : institution.website;
    institution.logo = logo !== undefined ? logo : institution.logo;
    institution.mapLocation = mapLocation !== undefined ? mapLocation : institution.mapLocation;
    if (enabled !== undefined) institution.enabled = enabled;

    await institution.save();
    res.json(await institution.populate('destinationId'));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Toggle institution enabled status
// @route   PUT /api/institutions/:id/toggle
// @access  Private/Admin
router.put('/:id/toggle', protect, admin, async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }
    institution.enabled = !institution.enabled;
    await institution.save();
    res.json(institution);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
