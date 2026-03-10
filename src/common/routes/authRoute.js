const express = require('express');
const { generateOtp, validateOtp } = require('../controllers/authController');
const router = express.Router();

router.post('/generate-otp', generateOtp);
router.post('/validate-otp', validateOtp);

module.exports = router;