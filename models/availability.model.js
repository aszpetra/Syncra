const mongoose = require('mongoose');

const TimeSlotSchema = new mongoose.Schema({
    startTime: { type: String, required: true },
    endTime: { type: String, required: true }
}, { _id: false });

const DayAvailabilitySchema = new mongoose.Schema({
    dayOfWeek: { 
        type: Number, 
        required: true, 
        min: 0, 
        max: 6 
    },
    slots: [TimeSlotSchema]
}, { _id: false });

const AvailabilitySchema = new mongoose.Schema({
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true,
        unique: true
    },
    weeklyAvailability: [DayAvailabilitySchema]
});

module.exports = mongoose.model('Availability', AvailabilitySchema);