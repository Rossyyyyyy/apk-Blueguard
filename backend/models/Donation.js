// models/Donation.js
const mongoose = require('mongoose');

const DonationSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  wasteType: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Ready to Pickup', 'On the Way', 'Pickup Completed'],
    default: 'Pending',
  },
  statusHistory: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: String
  }],
  pickupAddress: {
    type: String,
  },
  contactNumber: {
    type: String,
  },
  notes: {
    type: String,
  },
  // Automatic timestamps for each status change
  readyToPickupTime: {
    type: Date,
  },
  onTheWayTime: {
    type: Date,
  },
  actualPickupTime: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

DonationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Donation', DonationSchema);