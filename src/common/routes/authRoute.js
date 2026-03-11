const express = require('express');
const { generateOtp, validateOtp, registerCarrier, registerShipper, userDetails } = require('../controllers/authController');
const { ro } = require('date-fns/locale');
const { uploadMultipleDocuments } = require('../middlewares/registrationUpload');
const { uploadShipperDocuments } = require('../middlewares/shipperUpload');
const router = express.Router();

router.post('/generate-otp', generateOtp);
router.post('/validate-otp', validateOtp);
router.post('/register-carrier',uploadMultipleDocuments, registerCarrier);
router.post('/register-shipper',uploadShipperDocuments, registerShipper);
router.get('/user-details/:userId', userDetails);
module.exports = router;