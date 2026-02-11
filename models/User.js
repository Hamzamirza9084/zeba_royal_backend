const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true
  },
  password: {
    type: String,
    required: [true, 'Please add a password']
  },
  role: {
    type: String,
    enum: ['student', 'admin', 'agent'],
    default: 'student'
  },
  // --- NEW FIELDS EXTRACTED FROM PDF ---
  profile: {
    firstName: String,
    middleName: String,
    lastName: String,
    dob: String, // or Date
    firstLanguage: String,
    countryOfCitizenship: String,
    address: {
      street: String,
      city: String,
      province: String,
      postalCode: String,
      country: String
    },
    education: [{
      level: String,
      institution: String,
      fromDate: String,
      toDate: String,
      degree: String,
      graduated: Boolean
    }],
    testScores: {
      gre: Boolean,
      gmat: Boolean
    }
  }
},
{
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);