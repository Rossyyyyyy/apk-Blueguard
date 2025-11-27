//models/OngoingReport.js

const mongoose = require("mongoose");

const OngoingReportSchema = new mongoose.Schema({
  type: String,
  description: String,
  address: String,
  comment: String,
  predictedLaw: String,
  reportTo: [String], 
  responderType: String, 
  reportedBy: String,
  dateReported: { type: Date, default: Date.now },
  status: { type: String, default: "Ongoing" }, 
  dateOngoing: { type: Date, default: Date.now }, // Track when it was marked as ongoing
});

module.exports = mongoose.model("OngoingReport", OngoingReportSchema);
