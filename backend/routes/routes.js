const express = require('express');
const router = express.Router();
const { handleGoogleLogin, handleDataRequestFromGoogle, handleLogout, getTeacherIdForLink } = require('../controllers/auth.controller');
const bookingController = require('../controllers/booking.controller');
const availabilityController = require('../controllers/availability.controller');

router.get('/public/availability/:teacherId', bookingController.getPublicAvailability);
router.post('/public/book', bookingController.handlePublicBooking);

// --- PRIVATE AUTH ROUTES ---
router.get('/auth', handleGoogleLogin);
router.get('/data', handleDataRequestFromGoogle); 
router.post('/logout', handleLogout);

// --- PRIVATE AVAILABILITY ROUTES (3.) ---
router.get('/api/availability/settings', bookingController.getRecurringAvailability);
router.post('/api/availability/settings', bookingController.setRecurringAvailability);
router.post('/api/availability/block', bookingController.blockSpecificTime);
router.get('/api/user/id', getTeacherIdForLink);

// --- PRIVATE CALENDAR INTEGRATION ROUTES (4.) ---
router.get('/api/calendars/list', bookingController.listGoogleCalendars);
router.post('/api/calendars/select', bookingController.selectCalendarsForSync);
router.get('/availability/:teacherId', availabilityController.getTeacherAvailability); 
router.post('/availability', availabilityController.saveTeacherAvailability);

module.exports = router;
