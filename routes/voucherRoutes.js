const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucherControllers');

router.post('/apply', voucherController.applyVoucher);
router.post('/create', voucherController.createVoucher);
router.get('/', voucherController.getVouchers);
router.delete('/:id', voucherController.deleteVoucher);
router.put('/update/:id', voucherController.updateVoucher);

module.exports = router;
