const express = require('express');
const router = express.Router();
const hunterController = require('../controllers/hunterController');
const { verifyUser } = require("../middlewares/auth");

// Route to handle file upload
router.post('/getNearbyServiceProviders',hunterController.getNearbyServiceProviders);
router.put('/updateById/:id', hunterController.updateHunterById);
router.patch('/updateRadius', verifyUser, hunterController.updateRadius);

module.exports = router;