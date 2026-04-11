const mongoose = require('mongoose');

const destinationSchema = mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  enabled: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Destination', destinationSchema);
