const express = require('express');
const router = express.Router();
const { handleGoogleLogin, handleDataRequestFromGoogle } = require('../controllers/auth.controller');

router.get('/auth', handleGoogleLogin);

router.get('/data', handleDataRequestFromGoogle);

module.exports = router;