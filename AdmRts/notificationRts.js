const express = require('express');
const router = express.Router();
const notificationController = require('../AdmCtrl/notificationController');

router.post('/send/:userType/:userId', notificationController.createNotification);
router.get('/getAll/:userType/:userId', notificationController.getAllNotifications);
router.get('/getById/:userType/:userId/:id', notificationController.getNotificationById);
router.delete('/delete/:userType/:userId/:id', notificationController.deleteNotification);

module.exports = router;
  