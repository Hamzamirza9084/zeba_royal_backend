const mongoose = require('mongoose');

const universitySchema = mongoose.Schema({
  // University Info
  name: { type: String, required: true },
  country: { type: String, required: true },
  city: { type: String, required: true },
  ranking: String,
  website: String,
  logo: String,

  // Course Details
  courseName: { type: String, required: true },
  courseLevel: { type: String, required: true },
  program: { type: String },
  fieldOfStudy: { type: String },
  duration: String,
  tuitionFee: String,
  intakes: [String],
  courseLink: String,

  // Admission Rules
  minCgpa: String,
  maxBacklogs: Number,
  gapAccepted: { type: String, enum: ['Yes', 'No'], default: 'No' },
  gapLimit: Number,
  appFee: { type: String, default: 'Free Waiver' },
  successChance: { type: String, default: 'High' },

  // English Requirements
  englishRequirements: [{
    testName: { type: String, enum: ['IELTS', 'PTE', 'TOEFL', 'DET'] },
    minOverall: Number,
    minSection: Number
  }],
  acceptsMOI: { type: String, enum: ['Yes', 'No'], default: 'No' },

  // Additional
  casPriority: String,
  internalProcessing: String,
  tags: [String],

  // Link to the admin who created it
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('University', universitySchema);