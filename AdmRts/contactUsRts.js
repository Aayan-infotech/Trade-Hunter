const express = require('express');
const router = express.Router();
const ContactUsController = require('../AdmCtrl/contactUsController');

router.post("/send", ContactUsController.createContact);
router.get("/getAll", ContactUsController.getAllContacts);


module.exports = router;
  