const mongoose = require('mongoose');

const CleanupSchema = new mongoose.Schema({
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
  score: {
    type: Number,
    required: true,
  },
  garbageType: {
    type: String,
    enum: [
      'Plastic Bottles',
      'Plastic Bags', 
      'Food Waste',
      'Metal Cans',
      'Glass Bottles',
      'Fishing Gear',
      'Styrofoam',
      'Cigarette Butts',
      'Paper/Cardboard',
      'General Waste'
    ],
    default: 'General Waste'
  },
  detectionConfidence: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Cleanup', CleanupSchema);