const mongoose = require('mongoose');

const reportedSchema = new mongoose.Schema({
  type: String,
  description: String,
  address: String,
  comment: String,
  predictedLaw: String,
  reportTo: [String],
  responderType: String,
  reportedBy: { type: String, required: true }, // Ensure reportedBy is required
  dateReported: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Reported', reportedSchema);
