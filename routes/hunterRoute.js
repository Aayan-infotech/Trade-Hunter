const express = require('express');
const router = express.Router();
const hunterController = require('../controllers/hunterController');

// Route to handle file upload
router.post('/getNearbyServiceProviders',hunterController.getNearbyServiceProviders); // for guest mode  

module.exports = router;