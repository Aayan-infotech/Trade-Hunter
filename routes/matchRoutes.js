const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const { verifyUser } = require("../middlewares/auth");

router.post('/getMatchedData',verifyUser, matchController.getMatchedData);
router.post('/getMatchedDataNotification',verifyUser, matchController.getMatchedDataNotification);

module.exports = router;