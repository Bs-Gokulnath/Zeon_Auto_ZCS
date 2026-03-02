const mongoose = require('mongoose');

const sessionDataSchema = new mongoose.Schema({
  // No strict schema - allow any fields from existing data
}, {
  timestamps: false,
  strict: false, // Allow flexible schema for all existing fields
  collection: 'session_data' // Explicitly use existing collection name
});

// Index for efficient date queries on end_date field
sessionDataSchema.index({ end_date: 1 });

const SessionData = mongoose.model('SessionData', sessionDataSchema);

module.exports = SessionData;
