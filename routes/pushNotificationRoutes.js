const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/pushNotificationController');
const { verifyUser } = require("../middlewares/auth");

router.post('/send-notification',verifyUser, notificationController.sendPushNotification);
router.get('/get-notification',verifyUser, notificationController.getNotificationsByUserId);
router.get('/Read-notification/:notificationId',verifyUser, notificationController.ReadNotification);
router.get('/AllRead-notification',verifyUser, notificationController.AllReadNotifications);
router.post('/sendNotification' , verifyUser, notificationController.sendPushNotification2);



module.exports = router;