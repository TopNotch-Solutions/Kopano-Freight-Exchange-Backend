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
    uploadShipperDocuments: upload.fields([
        { name: 'companyLogo', maxCount: 1 },
        { name: 'taxRegistrationPDF', maxCount: 1 },
        { name: 'businessLicensePDF', maxCount: 1 },
        { name: 'proofOfBusinessAddressPDF', maxCount: 1 },
        { name: 'registrationCertificatePDF', maxCount: 1 }
    ])
};