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

  // Top-level fields
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled', 'disputed'],
    default: 'pending',
    index: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be at least 0.01'],
    set: v => parseFloat(v.toFixed(2))
  },
  currency: {
    type: String,
    default: 'AUD',
    enum: ['AUD', 'USD', 'EUR', 'GBP'],
    uppercase: true
  },

  // Nested transaction sub-document
  transaction: {
    transactionPrice: {
      type: Number,
      min: 0
    },
    transactionStatus: {
      type: String,
      trim: true
    },
    transactionType: {
      type: String,
      enum: ['MOTO', 'EWAY', 'STRIPE', 'PAYPAL'],
      default: 'MOTO'
    },
    authorisationCode: {
      type: String,
      trim: true
    },
    transactionDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    transactionId: {
      type: String,
    }
  },

  // Nested payment sub-document
  payment: {
    paymentSource: {
      type: String,
      trim: true,
      enum: ['eway', 'stripe', 'paypal', 'credit_card', 'bank_transfer']
    },
    totalAmount: {
      type: Number,
      min: [0.01, 'Total amount must be at least 0.01']
    },
    countryCode: {
      type: String,
      trim: true,
      uppercase: true
    }
  },

  // Nested payer sub-document
  payer: {
    payerId: {
      type: String,
      trim: true
    },
    payerName: {
      type: String,
      trim: true
    },
    payerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: props => `${props.value} is not a valid email address!`
      }
    }
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for fast lookup
TransactionSchema.index({ userId: 1, status: 1 });
TransactionSchema.index({ 'transaction.transactionDate': -1 });
TransactionSchema.index({ amount: 1 });

// Virtual for formatted amount
TransactionSchema.virtual('amountFormatted').get(function() {
  return `${this.currency} ${this.amount.toFixed(2)}`;
});

// Auto-update updatedAt
TransactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('TransactionNEW', TransactionSchema);
