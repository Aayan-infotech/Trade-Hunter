const express = require('express');
const router = express.Router();
const MassNotificationController = require('../AdmCtrl/massNotifcation');
const { verifyUser } = require('../middlewares/auth');


router.post("/",verifyUser, MassNotificationController.sendMassNotification);
router.get("/",verifyUser,  MassNotificationController.getMassNotifications);

module.exports = router;
  