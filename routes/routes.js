const express = require('express');
const router = express.Router();
const { handleGoogleLogin, handleDataRequestFromGoogle, handleLogout, getTeacherIdForLink } = require('../controllers/auth.controller');
const { createBooking, listGoogleCalendars, selectCalendarsForSync, getBlockingCalendars } = require('../controllers/booking.controller');
const { getPublicAvailability, getTeacherAvailability, saveTeacherAvailability} = require('../controllers/availability.controller');
const { isAuthenticated } = require('../middleware/auth.middleware');

router.get('/api/public/availability/:teacherId', getPublicAvailability);
router.post('/api/public/book', createBooking);

router.get('/auth', handleGoogleLogin);
router.get('/api/data', isAuthenticated, handleDataRequestFromGoogle);
router.post('/api/logout', isAuthenticated, handleLogout);

router.get('/api/user/id', getTeacherIdForLink);
router.get('/api/calendars/list', isAuthenticated, listGoogleCalendars);
router.post('/api/calendars/select', isAuthenticated, selectCalendarsForSync);
router.get('/api/calendars/blocking', isAuthenticated, getBlockingCalendars);

router.get('/api/availability/:teacherId', isAuthenticated, getTeacherAvailability);
router.post('/api/availability', isAuthenticated, saveTeacherAvailability);

module.exports = router;
