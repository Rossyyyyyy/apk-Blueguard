const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true
  },
  sender: {
    type: String,
    required: true
  },
  responderType: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Message', MessageSchema);