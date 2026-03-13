const express = require('express');
const { allUserLoads, allUserLoadsPerPickUpLocation, allAcepted, acceptLoad, loadDeclean, allActiveLoads, allDeliveredLoads, allOfferLoads, allLoadsAcceptedToday, allDeliveredLoadsToday, deliverLoad, markLoadInTransit } = require('../controllers/loadController');
const { uploadDeliveryDocument } = require('../middlewares/uploadDeliveryPhoto');

const router = express.Router();

router.get("/user-loads", allUserLoads);
router.get("/user-loads/pickup-location/:pickUpLocation", allUserLoadsPerPickUpLocation);
router.post("/accept-load/:loadId", acceptLoad);
router.get("/accepted-loads/:carrierId", allAcepted);
router.put("/in-transit-loads/:loadId", markLoadInTransit);
router.put("/deliver-load/:loadId", uploadDeliveryDocument, deliverLoad);
router.put("/decline-load/:loadId", loadDeclean);
router.get("/active-loads/:carrierId", allActiveLoads);
router.get("/delivered-loads/:carrierId", allDeliveredLoads);
router.get("/offer-received", allOfferLoads);
router.get("/offer-accepted-today/:carrierId", allLoadsAcceptedToday);
router.get("/offer-delivered-today/:carrierId", allDeliveredLoadsToday);

module.exports = router;