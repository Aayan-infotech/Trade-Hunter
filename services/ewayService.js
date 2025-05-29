// services/ewayService.js

const axios = require('axios');
const { getSecrets } = require('../utils/awsSecrets');

// —————————————————————————————————————————————
// 1) Load eWAY credentials from AWS Secrets
// —————————————————————————————————————————————
let API_KEY, API_PASSWORD, API_URL;
let secretsLoaded = false;

getSecrets()
  .then(secrets => {
    API_KEY      = secrets.EWAY_API_KEY;
    API_PASSWORD = secrets.EWAY_PASSWORD;
    API_URL      = secrets.EWAY_URL;       // e.g. https://api.sandbox.ewaypayments.com/…
    secretsLoaded = true;
    console.log('eWAY secrets loaded');
  })
  .catch(err => {
    console.error('Failed to load eWAY secrets:', err);
  });

// Helper: ensure secrets are available
function ensureSecrets() {
  if (!secretsLoaded || !API_KEY || !API_PASSWORD || !API_URL) {
    throw new Error('eWAY credentials are not yet initialized');
  }
}

// Helper: Basic Auth header
function getAuthHeader() {
  const creds = `${API_KEY.trim()}:${API_PASSWORD.trim()}`;
  return `Basic ${Buffer.from(creds).toString('base64')}`;
}

// Helper: axios client instance
function client() {
  ensureSecrets();
  return axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type':  'application/json',
      Accept:          'application/json',
    },
    timeout: 20000,
  });
}

// —————————————————————————————————————————————
// 2) Create Token Customer
// —————————————————————————————————————————————
/**
 * Vaults a customer + card in eWAY, returning TokenCustomerID.
 * @param {Object} customerInfo { firstName, lastName, email, phone }
 * @param {Object} cardDetails  { name, number, expiryMonth, expiryYear, cvn }
 */
exports.createTokenCustomer = async (customerInfo, cardDetails) => {
  const payload = {
    Method: 'CreateTokenCustomer',
    Customer: {
      FirstName: customerInfo.firstName,
      LastName:  customerInfo.lastName,
      Email:     customerInfo.email,
      Phone:     customerInfo.phone,
      CardDetails: {
        Name:        cardDetails.name,
        Number:      cardDetails.number.replace(/\s+/g, ''),
        ExpiryMonth: cardDetails.expiryMonth.padStart(2, '0'),
        ExpiryYear:
          cardDetails.expiryYear.length === 2
            ? `20${cardDetails.expiryYear}`
            : cardDetails.expiryYear,
        CVN:         cardDetails.cvn,
      },
    },
  };

  const res = await client().post('', payload);
  if (!res.data?.Customer?.TokenCustomerID) {
    const err = res.data.Errors || res.data;
    throw new Error(`eWAY token creation failed: ${JSON.stringify(err)}`);
  }
  return res.data.Customer.TokenCustomerID;
};

// —————————————————————————————————————————————
// 3) One-off Transaction (MOTO / direct sale)
// —————————————————————————————————————————————
/**
 * Processes a one-off payment.
 * @param {Object} paymentData rapid API payload, e.g:
 *   {
 *     Customer: { CardDetails: {…} },
 *     Payment:  { TotalAmount: 1000, CurrencyCode: 'AUD' },
 *     TransactionType: 'MOTO',
 *     Capture: true
 *   }
 */
exports.createTransaction = async (paymentData) => {
  const res = await client().post('', paymentData);
  if (!res.data?.TransactionID) {
    const err = res.data.Errors || res.data;
    throw new Error(`Invalid eWAY response: ${JSON.stringify(err)}`);
  }
  return res.data;
};

// —————————————————————————————————————————————
// 4) Recurring Charge by Token
// —————————————————————————————————————————————
/**
 * Charges a stored TokenCustomerID.
 * @param {string} tokenCustomerID 
 * @param {number} amountCents     e.g. $10.00 => 1000
 * @param {string} currencyCode    default 'AUD'
 */
exports.chargeTokenCustomer = async (
  tokenCustomerID,
  amountCents,
  currencyCode = 'AUD'
) => {
  const payload = {
    Customer: {
      TokenCustomerID: tokenCustomerID,
    },
    Payment: {
      TotalAmount:  amountCents,
      CurrencyCode: currencyCode,
    },
    TransactionType: 'Recurring',
    Capture: true,
  };

  const res = await client().post('', payload);
  if (!res.data?.TransactionID) {
    const err = res.data.Errors || res.data;
    throw new Error(`eWAY recurring charge failed: ${JSON.stringify(err)}`);
  }
  return res.data;
};
