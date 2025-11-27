const mongoose = require('mongoose');

const completedReportSchema = new mongoose.Schema({
  type: String,
  description: String,
  address: String,
  comment: String,
  predictedLaw: String,
  reportTo: [String],
  responderType: String,
  reportedBy: String,
  dateReported: Date,
  dateCompleted: { type: Date, default: Date.now } // Store completion date
});

module.exports = mongoose.model('CompletedReport', completedReportSchema);
