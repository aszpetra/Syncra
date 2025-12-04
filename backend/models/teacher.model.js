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
  calendars: [
    {
      calendarId: String,
      name: String,
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Teacher', teacherSchema);