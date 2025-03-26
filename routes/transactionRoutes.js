const express = require("express");
const router = express.Router();
const  transactionController  = require("../controllers/transactionController");

// Transaction Routes
router.post('/transaction', transactionController.createTransaction);
router.get('/transactions', transactionController.getAllTransactions);
router.get('/transaction/:id', transactionController.getTransactionById);
router.get('/transaction/userId/:userId', transactionController.getTransactionsByUserId)
router.delete('/transaction/:id', transactionController.deleteTransaction);
router.get('/totalRevenue', transactionController.getTotalSubscriptionRevenue);


module.exports = router;