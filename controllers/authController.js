const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const fs = require('fs');
const pdf = require('pdf-parse');

// Generate JWT
const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// @desc    Register new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please add all fields' });
  }

  // Check if user exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: role || 'student', // Default role if not provided
  });

  if (user) {
    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user.id),
    });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
};

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Check for user email
  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user.id),
    });
  } else {
    res.status(400).json({ message: 'Invalid credentials' });
  }
};

// @desc    Get user data
// @route   GET /api/users/me
// @access  Private


// @desc    Update user profile from uploaded PDF (ApplyBoard/Passport)
// @route   PUT /api/users/profile/upload-pdf
// @access  Private
const updateProfileFromPdf = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a PDF file' });
  }

  try {
    const dataBuffer = fs.readFileSync(req.file.path);
    const data = await pdf(dataBuffer);
    const text = data.text;

    // Helper for regex extraction
    const extract = (pattern) => {
      const match = text.match(pattern);
      return match ? match[1].trim() : null;
    };

    // Regex patterns based on standard ApplyBoard/Passport PDF structures
    const extractedData = {
      profile: {
        firstName: extract(/First Name \*\s+([^\n]+)/i),
        middleName: extract(/Middle Name\s+([^\n]+)/i),
        lastName: extract(/Last Name\s+([^\n]+)/i),
        dob: extract(/Date of Birth \*\s+([\d-]+)/), // Expecting YYYY-MM-DD format
        firstLanguage: extract(/First Language \*\s+([^\n]+)/i),
        countryOfCitizenship: extract(/Country of Citizenship\s+([^\n]+)/i),
        address: {
          street: extract(/Street Address \*\s+([^\n]+)/i),
          city: extract(/City\/Town\s+([^\n]+)/i),
          province: extract(/Province\/State \*\s+([^\n]+)/i),
          postalCode: extract(/Postal\/Zip Code\s+([^\n]+)/i),
        },
        // Attempt to extract one education block
        education: [{
          institution: extract(/Name of Institution \*\s+([^\n]+)/i),
          degree: extract(/Degree Name\s+([^\n]+)/i),
          fromDate: extract(/Attended Institution From \*\s+([\d-]+)/),
          toDate: extract(/Attended Institution To \*\s+([\d-]+)/),
          graduated: text.includes('I have graduated from this institution')
        }],
        testScores: {
          gre: text.includes('I have GRE exam scores'),
          gmat: text.includes('I have GMAT exam scores')
        }
      }
    };

    // Update the logged-in user with the extracted data
    // Using { new: true } returns the updated document
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: extractedData }, // Use $set to merge with existing data safely
      { new: true, runValidators: false } // runValidators false allows partial updates if schema is strict
    ).select('-password'); // Exclude password from response

    // Clean up the uploaded file from the server
    fs.unlinkSync(req.file.path);

    res.status(200).json(updatedUser);

  } catch (error) {
    console.error('PDF Processing Error:', error);
    // Ensure file is deleted even if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Error processing PDF file' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      // Direct overwrite of profile sections from request body
      user.personalInfo = req.body.personalInfo || user.personalInfo;
      user.addressDetails = req.body.addressDetails || user.addressDetails;
      user.backgroundInfo = req.body.backgroundInfo || user.backgroundInfo;
      user.educationDetails = req.body.educationDetails || user.educationDetails;
      user.schoolHistory = req.body.schoolHistory || user.schoolHistory;
      user.testScores = req.body.testScores || user.testScores;
      user.additionalDetails = req.body.additionalDetails || user.additionalDetails;

      // Update base fields if present
      if (req.body.name) user.name = req.body.name;
      if (req.body.email) user.email = req.body.email;
      
      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        personalInfo: updatedUser.personalInfo,
        // ... return other fields as needed for the frontend response
        message: "Profile updated successfully"
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error updating profile' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateUserProfile, // Export this
  updateProfileFromPdf,
};