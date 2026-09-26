const express = require('express');
const router = express.Router();
const Institution = require('../models/Institution');
const University = require('../models/University');
const Destination = require('../models/Destination');
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
    const institutions = await Institution.find(filter).populate('destinationId').sort({ name: 1 }).lean();

    // Optionally calculate program counts for each institution
    if (req.query.withCounts === 'true') {
      const counts = await University.aggregate([
        { $group: { _id: '$institutionId', count: { $sum: 1 } } }
      ]);
      const countMap = {};
      counts.forEach(c => {
        if (c._id) countMap[c._id.toString()] = c.count;
      });
      institutions.forEach(inst => {
        inst.programCount = countMap[inst._id.toString()] || 0;
      });
    }

    res.json(institutions);
  } catch (error) {
    console.error('getInstitutions error:', error);
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
      return res.status(400).json({ message: 'Institution name and destination are required' });
    }

    const trimmedName = name.trim().replace(/\s+/g, ' ');
    const trimmedCity = (city || '').trim().replace(/\s+/g, ' ');
    const escName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Fetch destination name for user-friendly error messages
    const destination = await Destination.findById(destinationId);
    const destName = destination ? destination.name : 'this country';

    // Check if an institution with this name already exists in this destination
    const existingSameName = await Institution.findOne({
      destinationId,
      name: { $regex: new RegExp(`^${escName}$`, 'i') }
    });

    if (existingSameName) {
      // If city is provided, also check if it's the exact same city or same institution
      return res.status(400).json({ 
        message: `"${trimmedName}" is already there for ${destName}!`,
        existingId: existingSameName._id 
      });
    }

    const institution = await Institution.create({
      name: trimmedName,
      destinationId,
      city: trimmedCity,
      ranking: ranking ? ranking.trim() : '',
      website: website ? website.trim() : '',
      logo: logo ? logo.trim() : '',
      mapLocation: mapLocation ? mapLocation.trim() : ''
    });
    
    res.status(201).json(await institution.populate('destinationId'));
  } catch (error) {
    console.error('addInstitution error:', error);
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

    const newName = name ? name.trim().replace(/\s+/g, ' ') : institution.name;
    const newDestId = destinationId || institution.destinationId;

    // Check for duplicates excluding current institution
    if (newName || destinationId) {
      const escName = newName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const duplicate = await Institution.findOne({
        _id: { $ne: req.params.id },
        destinationId: newDestId,
        name: { $regex: new RegExp(`^${escName}$`, 'i') }
      }).populate('destinationId');

      if (duplicate) {
        return res.status(400).json({ 
          message: `"${newName}" is already there for ${duplicate.destinationId?.name || 'this country'}!` 
        });
      }
    }

    institution.name = newName;
    institution.destinationId = newDestId;
    institution.city = city !== undefined ? city.trim() : institution.city;
    institution.ranking = ranking !== undefined ? ranking.trim() : institution.ranking;
    institution.website = website !== undefined ? website.trim() : institution.website;
    institution.logo = logo !== undefined ? logo.trim() : institution.logo;
    institution.mapLocation = mapLocation !== undefined ? mapLocation.trim() : institution.mapLocation;
    if (enabled !== undefined) institution.enabled = enabled;

    await institution.save();
    res.json(await institution.populate('destinationId'));
  } catch (error) {
    console.error('updateInstitution error:', error);
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
    console.error('toggleInstitution error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Delete an institution
// @route   DELETE /api/institutions/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }

    const programCount = await University.countDocuments({ institutionId: req.params.id });

    // If query ?mergeInto=otherId is specified, reassign programs before deletion
    if (req.query.mergeInto) {
      const targetInst = await Institution.findById(req.query.mergeInto);
      if (!targetInst) {
        return res.status(400).json({ message: 'Target merge institution not found' });
      }
      await University.updateMany(
        { institutionId: req.params.id },
        { $set: { institutionId: targetInst._id, name: targetInst.name } }
      );
    } else if (programCount > 0 && req.query.force !== 'true') {
      return res.status(400).json({ 
        message: `Cannot delete: ${programCount} program(s) are linked to this institution. Please reassign or delete them first.` 
      });
    }

    await institution.deleteOne();
    res.json({ message: 'Institution deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('deleteInstitution error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
