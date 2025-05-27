const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucherControllers');
const { verifyUser } = require("../middlewares/auth");

router.post('/apply', verifyUser, voucherController.applyVoucher);
router.post('/create',verifyUser, voucherController.createVoucher);
router.get('/', verifyUser, voucherController.getVouchers);
router.delete('/:id',verifyUser, voucherController.deleteVoucher);
router.put('/update/:id',verifyUser,  voucherController.updateVoucher);
router.get('/getVoucherUsers/:userId',verifyUser,  voucherController.getVoucherSubscriptionByUserId)

module.exports = router;
