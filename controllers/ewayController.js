const Transaction = require('../models/TransactionModelNew');
const ewayService = require('../services/ewayService');
const mongoose = require('mongoose');


exports.initiatePayment = async (req, res) => {
    try {
        const { userId, subscriptionPlanId, amount, email, payerName, cardNumber, expiryMonth, expiryYear, cvn, street1, city, state, postalCode, country } = req.body;

        const paymentData = {
            Customer: {
              FirstName: payerName,
              Email: email,
              Street1: street1,
              City: city,
              State: state,
              PostalCode: postalCode,
              Country: country, // must be 'AU'
              CardDetails: {
                Name: payerName,
                Number: cardNumber,
                ExpiryMonth: expiryMonth,
                ExpiryYear: expiryYear,
                CVN: cvn
              }
            },
            Payment: {
              TotalAmount: amount * 100, // cents
              CurrencyCode: 'AUD'
            },
            TransactionType: 'Purchase'
          };
          
          
  
      const ewayResponse = await ewayService.createTransaction(paymentData);
  
      console.log('Eway Response:', JSON.stringify(ewayResponse, null, 2));  // 🛑 Add this to debug
  
      // Now safely extract fields
      const transactionId = ewayResponse?.TransactionID || new mongoose.Types.ObjectId().toHexString();
      const transactionStatus = ewayResponse?.TransactionStatus || 'Pending';
      const transactionDate = ewayResponse?.TransactionDate ? new Date(ewayResponse.TransactionDate) : new Date();
      const transactionPrice = ewayResponse?.Payment?.TotalAmount ? (ewayResponse.Payment.TotalAmount / 100) : amount;
      const payerId = ewayResponse?.Customer?.TokenCustomerID || '';
      const paymentSource = 'eway';
  
      const transaction = new Transaction({
        userId,
        subscriptionPlanId,
        amount,
        transactionId,
        paymentMethod: 'eway',
        status: transactionStatus.toLowerCase(),
        transactionStatus,
        transactionDate,
        transactionPrice,
        payer: payerName,
        email: email,
        payerId,
        paymentSource
      });
  
      await transaction.save();
  
      res.status(200).json({ message: 'Transaction initiated successfully', data: ewayResponse });
  
    } catch (error) {
      console.error('Eway Error:', error);
      res.status(500).json({ message: 'Payment initiation failed', error: error.message });
    }
  };
