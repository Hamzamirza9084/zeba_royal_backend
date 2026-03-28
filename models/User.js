const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  // --- Auth Fields ---
  name: { type: String, required: [true, 'Please add a name'] },
  email: { type: String, required: [true, 'Please add an email'], unique: true },
  password: { type: String, required: [true, 'Please add a password'] },
  role: { type: String, enum: ['user', 'student', 'admin'], default: 'student' },
  // NOTE: 'student' included to support legacy/explicit student accounts
  // (keeps backward compatibility with frontend role checks)

  // --- 2. Smart Document Vault ---
  documents: [{
    fileName: String,
    fileUrl: String,
    cloudinaryId: String,
    uploadDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['Pending', 'Received', 'Verified'], default: 'Received' }
  }],

  // --- 3. Personal Information ---
  personalInfo: {
    firstName: String,
    middleName: String,
    lastName: String,
    dob: Date,
    firstLanguage: String,
    citizenship: String,
    maritalStatus: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed'] },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    passport: {
      number: String,
      expiryDate: Date,
      placeOfBirth: String
    },
    guardianName: String,
    guardianPhone: String,
    guardianEmail: String
  },

  // --- 4. Address Section ---
  address: {
    street: String,
    city: String,
    country: String,
    state: String,
    zipCode: String,
    phone: String,
    phoneCountryCode: String
  },

  // --- 5. Education Details (Repeater) ---
  education: [{
    country: String,
    schoolName: String,
    level: String, // e.g., High School, Bachelors
    gradingScheme: String,
    score: String,
    scoreScale: String,
    language: String,
    attendedFrom: Date,
    attendedTo: Date,
    degreeName: String,
    isGraduated: Boolean,
    graduationDate: Date,
    hasPhysicalCertificate: Boolean,
    schoolAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String
    }
  }],

  // --- 6. Test Scores ---
  testScores: {
    englishProficiency: String, // e.g., "I have proof"
    examType: String, // e.g., Duolingo, IELTS
    examDate: Date,
    overallScore: String
  },

  // --- 7. Saved Items ---
  savedColleges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'University' }]
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);