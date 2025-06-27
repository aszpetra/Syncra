const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true,
  },
  calendarId: {
    type: String,
    required: true,
  },
  dayOfWeek: {
    type: String,
    enum: ['1', '2', '3', '4', '5', '6', '7'], // monday, tuesday, wednesday, thursday, friday, saturday, sunday
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Availability', availabilitySchema);