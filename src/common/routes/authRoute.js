const express = require('express');
const { generateOtp, validateOtp, registerCarrier, registerShipper, userDetails, updateCarrierDetails, updateCarrierFiles, updateShipperDetails, updateShipperFiles } = require('../controllers/authController');
const { ro } = require('date-fns/locale');
const { uploadMultipleDocuments } = require('../middlewares/registrationUpload');
const { uploadShipperDocuments } = require('../middlewares/shipperUpload');
const router = express.Router();

router.post('/generate-otp', generateOtp);
router.post('/validate-otp', validateOtp);
router.post('/register-carrier',uploadMultipleDocuments, registerCarrier);
router.post('/register-shipper',uploadShipperDocuments, registerShipper);
router.get('/user-details/:userId', userDetails);
router.put('/modify-carrier-details/:id', updateCarrierDetails);
router.put('/modify-carrier-files/:id', uploadMultipleDocuments, updateCarrierFiles);
router.put('/modify-shipper-details/:id', updateShipperDetails);
router.put('/modify-shipper-files/:id',uploadShipperDocuments, updateShipperFiles);
module.exports = router;