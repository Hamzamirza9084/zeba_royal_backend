const Application = require('../models/Application');
const University = require('../models/University');
const User = require('../models/User');

// @desc    Apply to a university program
// @route   POST /api/applications
// @access  Private (Student)
const applyToUniversity = async (req, res) => {
  try {
    const { universityId } = req.body;

    if (!universityId) {
      res.status(400);
      throw new Error('University ID is required');
    }

    const university = await University.findById(universityId);
    if (!university) {
      res.status(404);
      throw new Error('University/Program not found');
    }

    // Check if user is a student
    if (req.user.role === 'admin') {
      res.status(400);
      throw new Error('Admins cannot apply to programs');
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
      student: req.user._id,
      university: universityId,
    });

    if (existingApplication) {
      res.status(400);
      throw new Error('You have already applied to this program');
    }

    const application = await Application.create({
      student: req.user._id,
      university: universityId,
    });

    res.status(201).json(application);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get my applications
// @route   GET /api/applications/my
// @access  Private
const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ student: req.user._id })
      .populate('university')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all applications (Admin)
// @route   GET /api/applications
// @access  Private/Admin
const getAllApplications = async (req, res) => {
  try {
    const applications = await Application.find({})
      .populate('student', '-password') // Exclude password
      .populate('university')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update application status
// @route   PUT /api/applications/:id
// @access  Private/Admin
const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      res.status(400);
      throw new Error('Status is required');
    }

    const application = await Application.findById(req.params.id);

    if (!application) {
      res.status(404);
      throw new Error('Application not found');
    }

    application.status = status;
    await application.save();

    res.json(application);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  applyToUniversity,
  getMyApplications,
  getAllApplications,
  updateApplicationStatus,
};
