const Transaction = require("../models/TransactionModelNew");
const ewayService = require("../services/ewayService");

exports.initiatePayment = async (req, res) => {
  try {
    const requiredCustomerFields = [
      "FirstName",
      "LastName",
      "Email",
      "CardDetails",
    ];
    const requiredCardFields = [
      "Name",
      "Number",
      "ExpiryMonth",
      "ExpiryYear",
      "CVN",
    ];
    const requiredPaymentFields = ["TotalAmount", "CurrencyCode"];

    const { Customer, Payment, userId, subscriptionPlanId } = req.body;
    if (!Customer || !Payment) {
      return res
        .status(400)
        .json({ message: "Missing Customer or Payment object" });
    }
    const missingCustomer = requiredCustomerFields.filter((f) => !Customer[f]);
    const missingCard = requiredCardFields.filter(
      (f) => !Customer.CardDetails?.[f]
    );
    const missingPayment = requiredPaymentFields.filter((f) => !Payment[f]);
    if (missingCustomer.length || missingCard.length || missingPayment.length) {
      return res.status(400).json({
        message: "Missing required fields",
        missingFields: {
          Customer: missingCustomer,
          CardDetails: missingCard,
          Payment: missingPayment,
        },
      });
    }

    const paymentData = {
      Customer: {
        FirstName: Customer.FirstName,
        LastName: Customer.LastName,
        Email: Customer.Email,
        CardDetails: {
          Name: Customer.CardDetails.Name,
          Number: Customer.CardDetails.Number.replace(/\s/g, ""),
          ExpiryMonth: Customer.CardDetails.ExpiryMonth.padStart(2, "0"),
          ExpiryYear:
            Customer.CardDetails.ExpiryYear.length === 2
              ? `20${Customer.CardDetails.ExpiryYear}`
              : Customer.CardDetails.ExpiryYear,
          CVN: Customer.CardDetails.CVN,
        },
      },
      Payment: {
        TotalAmount: Payment.TotalAmount,
        CurrencyCode: Payment.CurrencyCode,
      },
      TransactionType: "MOTO",
      Capture: true,
    };

    const ewayResponse = await ewayService.createTransaction(paymentData);

    const txId = ewayResponse.TransactionID;
    if (!txId) {
      return res.status(400).json({
        message: "Failed to process payment: Missing TransactionID",
        error: "TransactionID not found in response",
        details: ewayResponse,
      });
    }

    const txn = new Transaction({
      userId,
      subscriptionPlanId,

      status: Payment
        ? ewayResponse.TransactionStatus
          ? "completed"
          : "failed"
        : "pending",
      amount: (Payment.TotalAmount || 0) / 100,
      currency: Payment.CurrencyCode,

      transaction: {
        transactionPrice: (ewayResponse.Payment?.TotalAmount || 0) / 100,
        transactionStatus: ewayResponse.TransactionStatus
          ? "Success"
          : "Failed",
        transactionType: ewayResponse.TransactionType,
        authorisationCode: ewayResponse.AuthorisationCode,
        transactionDate: new Date(),
      },

      payment: {
        paymentSource: "eway",
        totalAmount: (Payment.TotalAmount || 0) / 100,
        countryCode: Payment.CurrencyCode,
      },

      payer: {
        payerId: ewayResponse.Customer.TokenCustomerID || "",
        payerName: ewayResponse.Customer.CardDetails.Name,
        payerEmail: ewayResponse.Customer.Email,
      },
    });

    await txn.save();

    return res.status(200).json({
      message: "Payment processed successfully",
      userId,
      subscriptionPlanId,
      transactionId: txId,
      status: ewayResponse.TransactionStatus,
      responseCode: ewayResponse.ResponseCode,
      amountCharged: (Payment.TotalAmount || 0) / 100,
      gatewayResponse: ewayResponse,
    });
  } catch (error) {
    console.error("Payment Processing Error:", error);

    if (error.response?.data) {
      console.error("eWAY Error:", error.response.data);
      return res.status(500).json({
        message: "Payment initiation failed",
        error: error.message,
        details: error.response.data,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }

    return res.status(500).json({
      message: "Payment initiation failed",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction
      .find()
      .sort({ 'transaction.transactionDate': -1 });

    return res.status(200).json({
      count: transactions.length,
      transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({
      message: 'Failed to fetch transactions',
      error:   error.message
    });
  }
};
