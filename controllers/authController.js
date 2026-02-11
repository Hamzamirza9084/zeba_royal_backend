const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const fs = require('fs');
const pdf = require('pdf-parse');

// Generate JWT
const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// Helper function to convert string booleans to actual booleans
const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
  }
  return Boolean(value);
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
      const body = req.body;

      // Map personalInfo to schema fields
      if (body.personalInfo) {
        user.firstName = body.personalInfo.firstName || user.firstName;
        user.middleName = body.personalInfo.middleName || user.middleName;
        user.lastName = body.personalInfo.lastName || user.lastName;
        user.dob = body.personalInfo.dateOfBirth || user.dob;
        user.firstLanguage = body.personalInfo.firstLanguage || user.firstLanguage;
        user.citizenship = body.personalInfo.countryOfCitizenship || user.citizenship;
        user.passportNumber = body.personalInfo.passportNumber || user.passportNumber;
        user.passportExpiry = body.personalInfo.passportExpiryDate || user.passportExpiry;
        user.passportPlaceOfBirth = body.personalInfo.passportPlaceOfBirth || user.passportPlaceOfBirth;
        user.gender = body.personalInfo.gender || user.gender;
        user.maritalStatus = body.personalInfo.maritalStatus || user.maritalStatus;
        user.phone = body.personalInfo.phoneNumber || user.phone;
        user.studentEmail = body.personalInfo.studentEmail || user.studentEmail;
      }

      // Map addressDetails to address schema
      if (body.addressDetails) {
        user.address = {
          street: body.addressDetails.street || user.address?.street,
          city: body.addressDetails.city || user.address?.city,
          country: body.addressDetails.country || user.address?.country,
          province: body.addressDetails.province || user.address?.province,
          zipCode: body.addressDetails.postalCode || user.address?.zipCode
        };
      }

      // Map backgroundInfo
      if (body.backgroundInfo) {
        user.background = {
          visaRefusal: toBoolean(body.backgroundInfo.refusedVisa),
          hasValidPermit: toBoolean(body.backgroundInfo.validStudyPermit),
          permitDetails: body.backgroundInfo.details || user.background?.permitDetails
        };
      }

      // Map educationDetails
      if (body.educationDetails) {
        user.highestEducation = {
          country: body.educationDetails.countryOfEducation || user.highestEducation?.country,
          level: body.educationDetails.highestLevel || user.highestEducation?.level,
          gradingScheme: body.educationDetails.gradingScheme || user.highestEducation?.gradingScheme,
          gradeAverage: body.educationDetails.gradeAverage || user.highestEducation?.gradeAverage,
          graduated: toBoolean(body.educationDetails.graduatedMostRecent)
        };
      }

      // Map schoolHistory
      if (body.schoolHistory) {
        user.schoolHistory = body.schoolHistory.map(school => ({
          country: school.countryOfInstitution,
          name: school.schoolName,
          level: school.educationLevel,
          gradingScheme: school.gradingScheme,
          language: school.primaryLanguage,
          from: school.attendedFrom,
          to: school.attendedTo,
          degree: school.degreeName,
          graduated: toBoolean(school.graduated),
          graduationDate: school.graduationDate,
          certificateAvailable: toBoolean(school.physicalCertificateAvailable),
          address: school.schoolAddress
        }));
      }

      // Map testScores
      if (body.testScores) {
        user.testScores = {
          proofAvailable: toBoolean(body.testScores.proofOfLanguageProficiency),
          conditionalAdmission: toBoolean(body.testScores.applyConditionalAdmission),
          languageStatus: body.testScores.languageTestStatus,
          greScore: body.testScores.greScores,
          gmatScore: body.testScores.gmatScores,
          openToLanguageCourse: toBoolean(body.testScores.openToProficiencyCourse)
        };
      }

      // Map additionalDetails
      if (body.additionalDetails) {
        user.additionalDetails = {
          emergencyContacts: body.additionalDetails.emergencyContact,
          notes: body.additionalDetails.additionalNotes
        };
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
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
    
    // Helper to convert boolean to Yes/No string
    const boolToYesNo = (value) => {
      return value === true ? 'Yes' : value === false ? 'No' : '';
    };
    
    // Transform schema to frontend structure
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      personalInfo: {
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        dateOfBirth: user.dob,
        firstLanguage: user.firstLanguage,
        countryOfCitizenship: user.citizenship,
        passportNumber: user.passportNumber,
        passportExpiryDate: user.passportExpiry,
        passportPlaceOfBirth: user.passportPlaceOfBirth,
        gender: user.gender,
        maritalStatus: user.maritalStatus,
        phoneNumber: user.phone,
        studentEmail: user.studentEmail
      },
      addressDetails: {
        street: user.address?.street,
        city: user.address?.city,
        country: user.address?.country,
        province: user.address?.province,
        postalCode: user.address?.zipCode
      },
      backgroundInfo: {
        refusedVisa: boolToYesNo(user.background?.visaRefusal),
        validStudyPermit: boolToYesNo(user.background?.hasValidPermit),
        details: user.background?.permitDetails
      },
      educationDetails: {
        countryOfEducation: user.highestEducation?.country,
        highestLevel: user.highestEducation?.level,
        gradingScheme: user.highestEducation?.gradingScheme,
        gradeAverage: user.highestEducation?.gradeAverage,
        graduatedMostRecent: boolToYesNo(user.highestEducation?.graduated)
      },
      schoolHistory: (user.schoolHistory || []).map(school => ({
        countryOfInstitution: school.country,
        schoolName: school.name,
        educationLevel: school.level,
        gradingScheme: school.gradingScheme,
        primaryLanguage: school.language,
        attendedFrom: school.from,
        attendedTo: school.to,
        degreeName: school.degree,
        graduated: boolToYesNo(school.graduated),
        graduationDate: school.graduationDate,
        physicalCertificateAvailable: boolToYesNo(school.certificateAvailable),
        schoolAddress: school.address
      })),
      testScores: {
        proofOfLanguageProficiency: boolToYesNo(user.testScores?.proofAvailable),
        applyConditionalAdmission: user.testScores?.conditionalAdmission,
        languageTestStatus: user.testScores?.languageStatus,
        greScores: user.testScores?.greScore,
        gmatScores: user.testScores?.gmatScore,
        openToProficiencyCourse: boolToYesNo(user.testScores?.openToLanguageCourse)
      },
      additionalDetails: {
        emergencyContact: user.additionalDetails?.emergencyContacts,
        additionalNotes: user.additionalDetails?.notes
      }
    };
    
    res.status(200).json(userData);
  } catch (error) {
    console.error(error);
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