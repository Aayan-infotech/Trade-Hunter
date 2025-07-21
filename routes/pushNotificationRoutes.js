const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/pushNotificationController');
const { verifyUser } = require("../middlewares/auth");

router.post('/send-notification',verifyUser, notificationController.sendPushNotification);
router.post('/adminNotification', notificationController.sendPushNotificationAdmin);
router.get('/get-notification/:userType',verifyUser, notificationController.getNotificationsByUserId);
router.get('/Read-notification/:notificationId/:type',verifyUser, notificationController.ReadNotification);
router.get('/AllRead-notification',verifyUser, notificationController.AllReadNotifications);
router.post('/sendNotification' , verifyUser, notificationController.sendPushNotification2);
router.post('/sendAdminNotification/:receiverId' , notificationController.sendAdminNotification);
router.get('/getAdminNotification/:receiverId',verifyUser,  notificationController.getAdminNotification);
router.delete('/deleteNotification/:notificationId',verifyUser, notificationController.deleteNotificationById);
router.patch("/notification/:type/:id", notificationController.updateNotificationStatus);
router.get('/expiring-soon',verifyUser, notificationController.getExpiringSoonVouchers);
router.delete('/deleteforUser/:notificationId', verifyUser, notificationController.deleteNotificationByIdForUser);
// In routes/notificationRoutes.js or wherever your routes are defined
router.get("/unread-count/:userType", verifyUser, notificationController.getUnreadNotificationCount);


module.exports = router;