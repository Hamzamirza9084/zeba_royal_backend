const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const fs = require('fs');
const pdf = require('pdf-parse');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

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
const getMe = async (req, res) => {
  res.status(200).json(req.user);
};

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

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfileFromPdf,
};