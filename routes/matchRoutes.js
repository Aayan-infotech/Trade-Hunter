const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');

router.post('/getMatchedData', matchController.getMatchedData);

module.exports = router;