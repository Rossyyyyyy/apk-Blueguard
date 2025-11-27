const mongoose = require("mongoose");

const CancelledReportSchema = new mongoose.Schema({
  type: String,
  description: String,
  address: String,
  comment: String,
  predictedLaw: String,
  reportTo: [String], 
  responderType: String, 
  reportedBy: String,
  dateReported: { type: Date, default: Date.now },
  status: { type: String, default: "Cancelled" }, 
  dateCancelled: { type: Date, default: Date.now }, // Track when it was cancelled
});

module.exports = mongoose.model("CancelledReport", CancelledReportSchema);
