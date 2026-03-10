const express = require('express');
const { generateOtp, validateOtp, registerCarrier } = require('../controllers/authController');
const { ro } = require('date-fns/locale');
const { uploadMultipleDocuments } = require('../middlewares/registrationUpload');
const router = express.Router();

router.post('/generate-otp', generateOtp);
router.post('/validate-otp', validateOtp);
router.post('/register-carrier',uploadMultipleDocuments, registerCarrier);

module.exports = router;