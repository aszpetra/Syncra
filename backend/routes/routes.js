const express = require('express');
const router = express.Router();
const { handleGoogleLogin, handleDataRequestFromGoogle, handleLogout, getTeacherIdForLink } = require('../controllers/auth.controller');
const bookingController = require('../controllers/booking.controller');
const availabilityController = require('../controllers/availability.controller');

router.get('/public/availability/:teacherId', bookingController.getPublicAvailability);
router.post('/public/book', bookingController.createBooking);

router.get('/auth', handleGoogleLogin);
router.get('/data', handleDataRequestFromGoogle);
router.post('/logout', handleLogout);
router.get('/api/user/id', getTeacherIdForLink);

router.get('/api/calendars/list', bookingController.listGoogleCalendars);
router.post('/api/calendars/select', bookingController.selectCalendarsForSync);
router.get('/availability/:teacherId', availabilityController.getTeacherAvailability);
router.get('/api/calendars/blocking', bookingController.getBlockingCalendars);
router.post('/availability', availabilityController.saveTeacherAvailability);

module.exports = router;
