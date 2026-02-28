const mongoose = require('mongoose');

const applicationSchema = mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  university: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'University',
  },
  status: {
    type: String,
    enum: ['Pending', 'Under Review', 'Accepted by University', 'Accepted by Anvora', 'Rejected by University', 'Rejected by Anvora'],
    default: 'Pending',
  },
  appliedDate: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);
