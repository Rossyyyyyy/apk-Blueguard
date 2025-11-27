// models/Users.js - UPDATED VERSION
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true 
  },
  gender: { 
    type: String, 
    enum: ['male', 'female', 'non-binary'], 
    required: true 
  },
  
  // Profile information
  bio: {
    type: String,
    default: '',
    maxlength: 500
  },
  phone: {
    type: String,
    default: ''
  },
  profilePicture: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  
  // Verification
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  verificationToken: { 
    type: String 
  },
  
  // Account status
  status: { 
    type: String, 
    enum: ['active', 'deactivated'], 
    default: 'active' 
  },
  
  // Social features
  followersCount: { 
    type: Number, 
    default: 0,
    min: 0
  },
  followingCount: { 
    type: Number, 
    default: 0,
    min: 0
  },
  
  // Privacy settings
  profileVisibility: {
    type: String,
    enum: ['public', 'private', 'followers-only'],
    default: 'public'
  },
  
  // Activity tracking
  lastActive: {
    type: Date,
    default: Date.now
  },
  
  // Achievements/Badges (optional)
  badges: [{
    name: String,
    earnedAt: Date,
    icon: String
  }],
  
  // Statistics
  totalPoints: {
    type: Number,
    default: 0
  },
  totalCleanups: {
    type: Number,
    default: 0
  },
  totalReports: {
    type: Number,
    default: 0
  }
  
}, { 
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ name: 1 });
userSchema.index({ status: 1 });
userSchema.index({ followersCount: -1 });
userSchema.index({ totalPoints: -1 });

// Virtual for full profile URL (if you have image hosting)
userSchema.virtual('profileUrl').get(function() {
  return this.profilePicture || '/default-avatar.jpg';
});

// Method to increment follower count
userSchema.methods.incrementFollowers = async function() {
  this.followersCount += 1;
  await this.save();
};

// Method to decrement follower count
userSchema.methods.decrementFollowers = async function() {
  this.followersCount = Math.max(0, this.followersCount - 1);
  await this.save();
};

// Method to increment following count
userSchema.methods.incrementFollowing = async function() {
  this.followingCount += 1;
  await this.save();
};

// Method to decrement following count
userSchema.methods.decrementFollowing = async function() {
  this.followingCount = Math.max(0, this.followingCount - 1);
  await this.save();
};

// Static method to find active users
userSchema.statics.findActiveUsers = function() {
  return this.find({ status: 'active', isVerified: true });
};

// Pre-save middleware to update lastActive
userSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.lastActive = new Date();
  }
  next();
});

module.exports = mongoose.model('User', userSchema);