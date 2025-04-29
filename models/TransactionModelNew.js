const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: [true, 'User ID is required'],
    index: true
  },
  subscriptionPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: [true, 'Subscription plan ID is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be at least 0.01'],
    set: v => parseFloat(v.toFixed(2)) // Ensure 2 decimal places
  },
  currency: {
    type: String,
    default: 'AUD',
    enum: ['AUD', 'USD', 'EUR', 'GBP'], // Add more as needed
    uppercase: true
  },
  transactionId: {
    type: String,
    required: [true, 'Transaction ID is required'],
    unique: true,
    index: true,
    trim: true
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'eway', 'stripe'],
    required: [true, 'Payment method is required']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled', 'disputed'],
    default: 'pending',
    index: true
  },
  transactionStatus: {
    type: String,
    trim: true
  },
  transactionDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  transactionPrice: {
    type: Number,
    min: 0
  },
  payer: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  payerId: {
    type: String,
    trim: true
  },
  paymentSource: {
    type: String,
    trim: true
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed // Store raw gateway response
  },
  ipAddress: {
    type: String,
    trim: true
  },
  deviceInfo: {
    type: String,
    trim: true
  },
  billingAddress: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, trim: true }
  },
  cardLastFour: {
    type: String,
    trim: true,
    minlength: 4,
    maxlength: 4
  },
  cardBrand: {
    type: String,
    trim: true,
    enum: ['visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', '']
  },
  refunds: [{
    amount: Number,
    reason: String,
    date: { type: Date, default: Date.now },
    processedBy: mongoose.Schema.Types.ObjectId
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed // For custom key-value pairs
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Auto-manage createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster querying
TransactionSchema.index({ userId: 1, status: 1 });
TransactionSchema.index({ transactionDate: -1 });
TransactionSchema.index({ amount: 1 });

// Virtual for formatted amount
TransactionSchema.virtual('amountFormatted').get(function() {
  return `${this.currency} ${this.amount.toFixed(2)}`;
});

// Pre-save hook to update timestamps
TransactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('TransactionNEW', TransactionSchema);