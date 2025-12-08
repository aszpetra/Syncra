const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  name: String,
  profilePicture: String,
  accessToken: String,
  refreshToken: String,
  blockingCalendarIds: { 
        type: [String],
        default: []
    },
    bookingCalendarId: { 
        type: String,
        default: 'primary'
    },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Teacher', teacherSchema);