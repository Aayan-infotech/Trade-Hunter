const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/pushNotificationController');

router.post('/send-notification', notificationController.sendPushNotification);
router.get('/get-notification/:userId', notificationController.getNotificationsByUserId);

module.exports = router;