const express = require('express');
const router = express.Router();
const MassNotificationController = require('../AdmCtrl/massNotifcation');

router.post("/", MassNotificationController.sendMassNotification);
router.get("/", MassNotificationController.getMassNotifications);

module.exports = router;
  