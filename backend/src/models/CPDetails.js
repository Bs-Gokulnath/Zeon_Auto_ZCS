const mongoose = require('mongoose');

const cpDetailsSchema = new mongoose.Schema({
  // No strict schema - allow any fields from existing data
}, {
  timestamps: false,
  strict: false, // Allow flexible schema for all existing fields
  collection: 'cp_details' // Explicitly use existing collection name
});

// Index for efficient cp_id queries
cpDetailsSchema.index({ cp_id: 1 });
cpDetailsSchema.index({ charge_point_id: 1 });

const CPDetails = mongoose.model('CPDetails', cpDetailsSchema);

module.exports = CPDetails;
