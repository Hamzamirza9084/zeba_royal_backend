const mongoose = require('mongoose');

const schoolHistorySchema = new mongoose.Schema({
  country: String,
  name: String,
  level: String,
  gradingScheme: String,
  language: String,
  from: Date,
  to: Date,
  degree: String,
  graduated: { type: Boolean, default: false },
  graduationDate: Date,
  certificateAvailable: { type: Boolean, default: false },
  address: {
    street: String,
    city: String,
    province: String,
    zipCode: String
  }
});

const userSchema = mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'student' },

  // PERSONAL INFORMATION
  firstName: String,
  middleName: String,
  lastName: String,
  dob: Date,
  firstLanguage: String,
  citizenship: String,
  passportNumber: String,
  passportExpiry: Date,
  passportPlaceOfBirth: String,
  gender: String,
  maritalStatus: String,
  phone: String,
  studentEmail: String,

  // ADDRESS DETAILS
  address: {
    street: String, city: String, country: String, province: String, zipCode: String
  },

  // BACKGROUND
  background: {
    visaRefusal: { type: Boolean, default: false },
    hasValidPermit: { type: Boolean, default: false },
    permitDetails: String
  },

  // EDUCATION (HIGHEST)
  highestEducation: {
    country: String, level: String, gradingScheme: String, gradeAverage: String, graduated: Boolean
  },

  // SCHOOL HISTORY (Multiple Entries)
  schoolHistory: [schoolHistorySchema],

  // TEST SCORES
  testScores: {
    proofAvailable: Boolean,
    conditionalAdmission: Boolean,
    languageStatus: String,
    greScore: String,
    gmatScore: String,
    openToLanguageCourse: Boolean
  },

  additionalDetails: {
    emergencyContacts: String,
    notes: String
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);