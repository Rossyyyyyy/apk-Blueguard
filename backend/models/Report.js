//Models/Report.js
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the User model
  name: { type: String, required: true }, // Name of the user
  boatName: { type: String, required: true }, // Boat Name
  eventDescription: { type: String, required: true }, // Event description
  comments: { type: String }, // Additional comments
  address: { type: String, required: true }, // Address
  incidentType: { type: String, required: true }, // Type of incident
  createdAt: { type: Date, default: Date.now } // Timestamp
});

module.exports = mongoose.model('Report', reportSchema);
