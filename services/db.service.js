const Teacher = require('../models/teacher.model');
const Availability = require('../models/availability.model');

async function getUserByGoogleId(userGoogleId) {
    return Teacher.findOne({ googleId: userGoogleId });
}

async function getUserById(userId) {
    return Teacher.findById(userId);
}

async function getUserRefreshToken(teacherId) {
    return Teacher.findById(teacherId).select('refreshToken');
}

function createUser(userData, accessToken, refreshToken) {
    return new Teacher({
        googleId: userData.id,
        email: userData.email,
        name: userData.name,
        profilePicture: userData.picture,
        accessToken: accessToken,
        refreshToken: refreshToken || null
    });
}

async function updateUserCalendars(teacherId, selectedCalendarIds, bookingId) {
    return Teacher.findByIdAndUpdate(teacherId, {
        blockingCalendarIds: selectedCalendarIds,
        bookingCalendarId: bookingId
    });
}

async function getUserCalendars(userId) {
    return Teacher.findById(userId).select('blockingCalendarIds bookingCalendarId');
}

async function updateAvailability(teacherId, availability) {
    return Availability.findOneAndUpdate(
        { teacher: teacherId },
        { weeklyAvailability: availability },
        { new: true, upsert: true }
    );
}
async function getAvailability(teacherId) {
    return Availability.findOne({ teacher: teacherId });
}

module.exports = { getUserByGoogleId, createUser, updateAvailability, getAvailability, getUserRefreshToken, getUserById, updateUserCalendars, getUserCalendars };