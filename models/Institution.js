const mongoose = require('mongoose');

const institutionSchema = mongoose.Schema({
  name: { type: String, required: true, trim: true },
  destinationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
  city: { type: String, trim: true },
  ranking: { type: String },
  website: { type: String },
  logo: { type: String },
  mapLocation: { type: String }, // For Google Maps embed
  enabled: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Institution', institutionSchema);
