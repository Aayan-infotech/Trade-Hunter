const express = require("express");
const router = express.Router();
const  transactionController  = require("../controllers/transactionController");

// Transaction Routes
router.post('/transaction', transactionController.createTransaction);
router.get('/transactions', transactionController.getAllTransactions);
router.get('/transaction/:id', transactionController.getTransactionById);
router.delete('/transaction/:id', transactionController.deleteTransaction);


module.exports = router;