const express = require('express');
const router = express.Router();
const hunterController = require('../controllers/hunterController');

// Route to handle file upload
router.post('/getNearbyServiceProviders',hunterController.getNearbyServiceProviders);
router.put('/updateById/:id', hunterController.updateHunterById);

module.exports = router;