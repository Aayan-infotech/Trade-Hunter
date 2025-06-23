const express = require('express');
const router = express.Router();
const MassNotificationController = require('../AdmCtrl/massNotifcation');
const { verifyUser } = require('../middlewares/auth');


router.post("/",verifyUser, MassNotificationController.sendMassNotification);
router.get("/",verifyUser,  MassNotificationController.getMassNotifications);
router.get("/getAll", MassNotificationController.getAllMassNotifications);
router.delete("/delete/:id",verifyUser, MassNotificationController.deleteNotificationById);
router.delete("/deleteforUser/:id",verifyUser, MassNotificationController.deleteForUser);

module.exports = router;
  