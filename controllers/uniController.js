const University = require('../models/University');

// @desc    Get all universities
// @route   GET /api/universities
const getUniversities = async (req, res) => {
  const universities = await University.find();
  res.status(200).json(universities);
};

// @desc    Set university
// @route   POST /api/universities
const setUniversity = async (req, res) => {
  // We assume the body contains all the fields from AdminAddUniversity.jsx
  const university = await University.create({
    ...req.body,
    createdBy: req.user.id
  });
  res.status(200).json(university);
};

module.exports = { getUniversities, setUniversity };