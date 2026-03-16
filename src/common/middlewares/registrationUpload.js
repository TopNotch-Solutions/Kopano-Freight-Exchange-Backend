const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/registration');
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

module.exports = {
    uploadMultipleDocuments: upload.fields([
        { name: 'profileImage', maxCount: 1 },
        { name: 'drivingLicenseBack', maxCount: 1 },
        { name: 'drivingLicenseFront', maxCount: 1 },
        { name: 'diskImage', maxCount: 1 },
        { name: 'vehicleFrontImage', maxCount: 1 },
        { name: 'vehicleBackImage', maxCount: 1 },
        { name: 'vehicleRearImage', maxCount: 1 },
        { name: 'vehicleRegistractionCertificate', maxCount: 1 },
        { name: 'roadWorthinessCertificate', maxCount: 1 },
        { name: 'operatingPermit', maxCount: 1 }
    ])
};