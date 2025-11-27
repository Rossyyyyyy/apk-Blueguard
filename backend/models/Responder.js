// backend/models/Responder.js - UPDATED VERSION
const mongoose = require('mongoose');

const ResponderSchema = new mongoose.Schema({
  responderType: {
    type: String,
    required: true,
    enum: ['admin', 'ngo', 'barangay', 'pcg']
  },
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  // NEW FIELDS FOR PCG SETTINGS
  address: {
    type: String,
    default: ''
  },
  contactNumber: {
    type: String,
    default: ''
  },
  // EXISTING FIELDS
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String
  },
  status: {
    type: String, 
    enum: ['active', 'deactivated'], 
    default: 'active' 
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true // Automatically adds createdAt and updatedAt
});

module.exports = mongoose.model('Responder', ResponderSchema);