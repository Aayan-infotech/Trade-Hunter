// services/stripeService.js

const Stripe = require('stripe');
const { getSecrets } = require('../utils/awsSecrets');

let stripeInstance = null;

const getStripe = async () => {
  if (stripeInstance) return stripeInstance;

  const secrets = await getSecrets();
  stripeInstance = Stripe(secrets.STRIPE_SECRET_KEY);
  return stripeInstance;
};

module.exports = getStripe;
