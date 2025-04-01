const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/pushNotificationController');
const { verifyUser } = require("../middlewares/auth");

router.post('/send-notification',verifyUser, notificationController.sendPushNotification);
router.get('/get-notification',verifyUser, notificationController.getNotificationsByUserId);
router.get('/Read-notification',verifyUser, notificationController.ReadNotification);
router.get('/AllRead-notification',verifyUser, notificationController.AllReadNotifications);



module.exports = router;