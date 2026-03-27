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

// @desc    Get single university
// @route   GET /api/universities/:id
const getUniversityById = async (req, res) => {
  const university = await University.findById(req.params.id);

  if (!university) {
    res.status(404);
    throw new Error('University not found');
  }

  res.status(200).json(university);
};

// @desc    Update university
// @route   PUT /api/universities/:id
const updateUniversity = async (req, res) => {
  const university = await University.findById(req.params.id);

  if (!university) {
    res.status(404);
    throw new Error('University not found');
  }

  // Optional: Check if the user is authorized to update this specific university
  // if (university.createdBy.toString() !== req.user.id) {
  //   res.status(401);
  //   throw new Error('Not authorized to update this university');
  // }

  const updatedUniversity = await University.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true } // Return the updated document & run schema validators
  );

  res.status(200).json(updatedUniversity);
};

// @desc    Delete university
// @route   DELETE /api/universities/:id
const deleteUniversity = async (req, res) => {
  const university = await University.findById(req.params.id);

  if (!university) {
    res.status(404);
    throw new Error('University not found');
  }

  await university.deleteOne();

  res.status(200).json({ id: req.params.id, message: 'University deleted successfully' });
};

// @desc    Upload an image file to be used as a university logo
// @route   POST /api/universities/upload-logo
// @access  Private/Admin
const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    // Cloudinary URL is returned in req.file.path
    res.status(201).json({ url: req.file.path });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getUniversities,
  setUniversity,
  getUniversityById,
  updateUniversity,
  deleteUniversity,
  uploadLogo
};