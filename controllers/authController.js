// controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');

// @desc    Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Please add all fields');
    }

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
          _id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          // Return existing profile data on login so frontend can pre-fill
          personalInfo: user.personalInfo,
          address: user.address,
          education: user.education,
          testScores: user.testScores,
          documents: user.documents,
          token: generateToken(user._id),
        });
    } else {
      res.status(400);
      throw new Error('Invalid credentials');
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get user data
// @route   GET /api/users/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password'); // Exclude password

    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update user profile (Student Application)
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Update fields if they are present in the request body
    // This allows for partial updates (e.g., just saving Personal Info)
    
    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email; // Note: Typically email changes require re-verification

    // Nested Objects - Mongoose handles these well, but we ensure we rewrite the object 
    // or merge it depending on your frontend strategy. Here we overwrite sections provided.
    
    if (req.body.personalInfo) {
        user.personalInfo = { ...user.personalInfo, ...req.body.personalInfo };
    }
    
    if (req.body.address) {
        user.address = { ...user.address, ...req.body.address };
    }

    if (req.body.testScores) {
        user.testScores = { ...user.testScores, ...req.body.testScores };
    }

    // Arrays - Typically replaced entirely by the frontend state for repeater fields
    if (req.body.education) {
        user.education = req.body.education;
    }

    if (req.body.documents) {
        user.documents = req.body.documents;
    }

    const updatedUser = await user.save();

    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      personalInfo: updatedUser.personalInfo,
      address: updatedUser.address,
      education: updatedUser.education,
      testScores: updatedUser.testScores,
      documents: updatedUser.documents,
      token: generateToken(updatedUser._id),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Upload a document and attach to user
// @route   POST /api/users/documents
// @access  Private
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Build file record
    const fileRecord = {
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      status: 'Pending'
    };

    user.documents = user.documents.concat(fileRecord);
    await user.save();

    res.status(201).json({ documents: user.documents });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a user's document and remove the file
// @route   DELETE /api/users/documents
// @access  Private
const deleteDocument = async (req, res) => {
  try {
    const { fileUrl } = req.body;
    if (!fileUrl) return res.status(400).json({ message: 'fileUrl is required' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const existing = user.documents || [];
    const updatedDocs = existing.filter(d => d.fileUrl !== fileUrl);

    if (updatedDocs.length === existing.length) {
      return res.status(404).json({ message: 'Document not found' });
    }

    user.documents = updatedDocs;
    await user.save();

    // Attempt to delete the file from disk
    try {
      const relPath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl; // remove leading slash
      const filePath = path.join(__dirname, '..', relPath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (fsErr) {
      // Log but don't fail the request
      console.error('Failed to delete file:', fsErr.message);
    }

    res.status(200).json({ documents: user.documents });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Serve a user's document with correct headers (inline view)
// @route   GET /api/users/documents/view/:filename
// @access  Private
const viewDocument = async (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename) return res.status(400).json({ message: 'filename required' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const doc = (user.documents || []).find(d => d.fileUrl && d.fileUrl.endsWith(filename));
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const relPath = path.join('uploads', filename);
    const filePath = path.join(__dirname, '..', relPath);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });

    res.setHeader('Content-Type', 'application/pdf');
    // Tell browser to display inline and suggest original filename when saving
    res.setHeader('Content-Disposition', `inline; filename="${doc.fileName.replace(/"/g, '')}"`);
    res.sendFile(filePath);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all students (admin only)
// @route   GET /api/users/students
// @access  Private/Admin
const getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: { $ne: 'admin' } }).select('-password');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get student by ID (admin only)
// @route   GET /api/users/students/:id
// @access  Private/Admin
const getStudentById = async (req, res) => {
  try {
    const student = await User.findById(req.params.id).select('-password');
    if (student) {
      res.json(student);
    } else {
      res.status(404).json({ message: 'Student not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  uploadDocument,
  deleteDocument,
  viewDocument,
  getStudents,
  getStudentById,
};