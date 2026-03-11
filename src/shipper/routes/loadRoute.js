const express = require('express');
const { create, allUserLoads, allUserLoadsActive, allUserLoadsCompleted, allUserLoadsPending } = require('../controllers/loadController');
const { loadUploadDocuments } = require('../middlewares/loadUpload');
const router = express.Router();

router.post('/create-load/:shipperId', loadUploadDocuments, create);
router.get("/user-loads/:shipperId", allUserLoads)
router.get("/user-loads-active/:shipperId", allUserLoadsActive)
router.get("/user-loads-pending/:shipperId", allUserLoadsPending)
router.get("/user-loads-completed/:shipperId", allUserLoadsCompleted)

module.exports = router;