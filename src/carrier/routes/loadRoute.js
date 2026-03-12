const express = require('express');
const { allUserLoads, allUserLoadsPerPickUpLocation, allAcepted, acceptLoad, loadDeclean } = require('../controllers/loadController');

const router = express.Router();

router.get("/user-loads", allUserLoads);
router.get("/user-loads/pickup-location/:pickUpLocation", allUserLoadsPerPickUpLocation);
router.post("/accept-load/:loadId", acceptLoad);
router.get("/accepted-loads/:carrierId", allAcepted);
router.put("/decline-load/:loadId", loadDeclean);



module.exports = router;