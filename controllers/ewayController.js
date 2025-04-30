const Transaction = require('../models/TransactionModelNew');
const ewayService = require('../services/ewayService');
const mongoose = require('mongoose');

exports.initiatePayment = async (req, res) => {
  try {

    const requiredCustomerFields = ['FirstName', 'LastName', 'Email', 'CardDetails'];
    const requiredCardFields = ['Name', 'Number', 'ExpiryMonth', 'ExpiryYear', 'CVN'];
    const requiredPaymentFields = ['TotalAmount', 'CurrencyCode'];

    const { Customer, Payment } = req.body;

    if (!Customer || !Payment) {
      return res.status(400).json({ message: 'Missing Customer or Payment object' });
    }

    const missingCustomerFields = requiredCustomerFields.filter(field => !Customer[field]);
    const missingCardFields = requiredCardFields.filter(field => !Customer.CardDetails?.[field]);
    const missingPaymentFields = requiredPaymentFields.filter(field => !Payment[field]);

    if (missingCustomerFields.length || missingCardFields.length || missingPaymentFields.length) {
      return res.status(400).json({
        message: 'Missing required fields',
        missingFields: {
          Customer: missingCustomerFields,
          CardDetails: missingCardFields,
          Payment: missingPaymentFields
        }
      });
    }

    const paymentData = {
      Customer: {
        FirstName: req.body.FirstName || 'Unknown',
        LastName: req.body.LastName || 'Unknown',
        Email: req.body.Email || 'noemail@example.com',
        CardDetails: {
          Name: req.body.CardName || `${req.body.FirstName} ${req.body.LastName}`,
          Number: req.body.CardNumber?.replace(/\s/g, '') || '',
          ExpiryMonth: req.body.ExpiryMonth?.padStart(2, '0') || '',
          ExpiryYear: req.body.ExpiryYear?.length === 2 ? `20${req.body.ExpiryYear}` : req.body.ExpiryYear,
          CVN: req.body.CVN || ''
        }
      },
      Payment: {
        TotalAmount: Math.round((req.body.Amount || 0) * 100),
        CurrencyCode: req.body.CurrencyCode || 'AUD'
      },
      TransactionType: 'MOTO',
      Capture: true
    };

    const ewayResponse = await ewayService.createTransaction(req.body);

    if (!ewayResponse.TransactionID) {
      return res.status(400).json({
        message: 'Failed to process payment: Missing TransactionID',
        error: 'TransactionID not found in response',
        details: ewayResponse
      });
    }

    const transaction = new Transaction({
      // userId: req.body.userId || '',
      // subscriptionPlanId: req.body.subscriptionPlanId || '',
      amount: (req.body.Payment?.TotalAmount || 0) / 100,
      transactionId: ewayResponse.TransactionID,
      paymentMethod: 'eway',
      status: ewayResponse.TransactionStatus ? 'success' : 'failed',
      transactionStatus: ewayResponse.TransactionStatus ? 'Success' : 'Failed',
      transactionDate: new Date(),
      transactionPrice: (ewayResponse.Payment?.TotalAmount || 0) / 100,
      payer: ewayResponse.Customer?.CardDetails?.Name || `${ewayResponse.Customer?.FirstName || ''} ${ewayResponse.Customer?.LastName || ''}`.trim(),
      email: ewayResponse.Customer?.Email || '',
      payerId: ewayResponse.Customer?.TokenCustomerID || '',
      paymentSource: 'eway',
      gatewayResponse: ewayResponse
    });

    // await transaction.save();

    return res.status(200).json({
      message: 'Payment processed successfully',
      transactionId: ewayResponse.TransactionID,
      status: ewayResponse.TransactionStatus,
      responseCode: ewayResponse.ResponseCode,
      amountCharged: req.body.amount
    });

  } catch (error) {
    console.error('Payment Processing Error:', error);

    // Log the full error response for debugging
    if (error.response) {
      console.error('Error Response:', error.response.data);
      return res.status(500).json({
        message: 'Payment initiation failed',
        error: error.message,
        details: error.response.data,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }

    // If no response object exists, handle generic error
    console.error('Error details:', error);
    return res.status(500).json({
      message: 'Payment initiation failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
