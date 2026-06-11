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

// Indexes for fast lookups
institutionSchema.index({ destinationId: 1 });
institutionSchema.index({ name: 1 });
institutionSchema.index({ destinationId: 1, name: 1 });

module.exports = mongoose.model('Institution', institutionSchema);
