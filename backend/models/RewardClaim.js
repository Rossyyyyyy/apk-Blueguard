// models/RewardClaim.js
const mongoose = require('mongoose');

const RewardClaimSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  rewardId: {
    type: String,
    required: true
  },
  rewardTitle: {
    type: String,
    required: true
  },
  pointsClaimed: {
    type: Number,
    required: true
  },
  claimId: {
    type: String,
    required: true
  },
  claimDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'redeemed', 'expired'],
    default: 'pending'
  },
  redeemedDate: {
    type: Date
  }
});

module.exports = mongoose.model('RewardClaim', RewardClaimSchema);