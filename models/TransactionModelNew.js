const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: true
  },
  subscriptionPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  transactionId: {     
    type: String,
    required: true,
    unique: true
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'eway'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionStatus: {    
    type: String
  },
  transactionDate: {      
    type: Date
  },
  transactionPrice: {     
    type: Number
  },
  payer: {                
    type: String
  },
  email: {               
    type: String
  },
  payerId: {             
    type: String
  },
  paymentSource: {       
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
});

module.exports = mongoose.model('TransactionNEW', TransactionSchema);