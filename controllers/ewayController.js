const Transaction = require('../models/TransactionModelNew');
const ewayService = require('../services/ewayService');
const mongoose = require('mongoose');

exports.initiatePayment = async (req, res) => {
  try {
    // Validate required fields first
    const requiredFields = [
      'userId', 'subscriptionPlanId', 'amount', 'email', 
      'payerName', 'cardNumber', 'expiryMonth', 'expiryYear', 'cvn'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: 'Missing required fields',
        missingFields
      });
    }

    // Prepare the payment data for eWAY
    const nameParts = req.body.payerName.trim().split(' ');
    const firstName = nameParts[0] || 'Test';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';

    const paymentData = {
      Customer: {
        FirstName: firstName,
        LastName: lastName,
        Email: req.body.email,
        Street1: req.body.street1 || 'Unknown',
        City: req.body.city || 'Unknown',
        State: req.body.state || 'NSW',
        PostalCode: req.body.postalCode || '2000',
        Country: req.body.country === 'AU' ? 'au' : (req.body.country || 'au').toLowerCase(),
        CardDetails: {
          Name: `${firstName} ${lastName}`,
          Number: req.body.cardNumber.replace(/\s/g, ''),
          ExpiryMonth: req.body.expiryMonth.padStart(2, '0'),
          ExpiryYear: req.body.expiryYear.length === 2 ? `20${req.body.expiryYear}` : req.body.expiryYear,
          CVN: req.body.cvn
        }
      },
      Payment: {
        TotalAmount: Math.round(req.body.amount * 100), // Amount in cents
        CurrencyCode: 'AUD'
      },
      TransactionType: 'Purchase',
      Capture: true,
      Options: {
        ValidateOnly: false // Set to true for testing validation without charging
      }
    };

    console.log('Eway Request Payload:', JSON.stringify(paymentData, null, 2));

    const ewayResponse = await ewayService.createTransaction(paymentData);

    // Log the full eWAY response to help debug
    console.log('eWAY Response:', JSON.stringify(ewayResponse, null, 2));

    // Check if the TransactionID exists in the eWAY response
    if (!ewayResponse.TransactionID) {
      return res.status(400).json({
        message: 'Failed to process payment: Missing TransactionID',
        error: 'TransactionID not found in response',
        details: ewayResponse
      });
    }

    // Create transaction record
    const transaction = new Transaction({
      userId: req.body.userId,
      subscriptionPlanId: req.body.subscriptionPlanId,
      amount: req.body.amount,
      transactionId: ewayResponse.TransactionID,
      paymentMethod: 'eway',
      status: ewayResponse.TransactionStatus ? ewayResponse.TransactionStatus.toLowerCase() : 'pending',
      transactionStatus: ewayResponse.TransactionStatus || 'Pending',
      transactionDate: new Date(),
      transactionPrice: (ewayResponse.Payment?.TotalAmount || req.body.amount * 100) / 100,
      payer: req.body.payerName,
      email: req.body.email,
      payerId: ewayResponse.Customer?.TokenCustomerID || '',
      paymentSource: 'eway',
      gatewayResponse: ewayResponse // Store full response
    });

    await transaction.save();

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
