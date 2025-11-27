// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userName: { 
    type: String, 
    required: true,
    index: true  // Index for faster queries
  },
  userEmail: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    default: 'Notification'
  },
  message: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    required: true,
    enum: ['report', 'schedule', 'reward', 'follow', 'cleanup', 'donation', 'alert', 'info', 'success', 'warning'],
    default: 'info'
  },
  reportId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Reported',
    required: false
  },
  read: { 
    type: Boolean, 
    default: false 
  },
  seen: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  actionUrl: {
    type: String,
    required: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient querying
notificationSchema.index({ userName: 1, createdAt: -1 });
notificationSchema.index({ userEmail: 1, read: 1 });

// Virtual for checking if notification is recent (within 24 hours)
notificationSchema.virtual('isRecent').get(function() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.createdAt >= oneDayAgo;
});

// Method to mark as read
notificationSchema.methods.markAsRead = async function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to mark all as read for a user
notificationSchema.statics.markAllAsReadForUser = async function(userName) {
  return this.updateMany(
    { userName, read: false },
    { read: true, readAt: new Date() }
  );
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userName) {
  return this.countDocuments({ userName, read: false });
};

// Static method to delete old read notifications (older than 30 days)
notificationSchema.statics.cleanupOldNotifications = async function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return this.deleteMany({ 
    read: true, 
    createdAt: { $lt: thirtyDaysAgo } 
  });
};

module.exports = mongoose.model('Notification', notificationSchema);