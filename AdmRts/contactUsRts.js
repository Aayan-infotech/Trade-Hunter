const express = require('express');
const router = express.Router();
const ContactUsController = require('../AdmCtrl/contactUsController');

router.post("/send", ContactUsController.createContact);
router.get("/getAll", ContactUsController.getAllContacts);
router.delete("/delete/:id",ContactUsController.deleteContact);
router.get("/isReadCount", ContactUsController.getReadCount);
router.put("/markAllRead", ContactUsController.markAllAsRead);

module.exports = router;
  