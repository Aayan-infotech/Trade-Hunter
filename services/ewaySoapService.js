const soap = require('soap');
require('dotenv').config();

const {
  EWAY_SOAP_WSDL_URL,
  EWAY_CUSTOMERID,
  EWAY_USERNAME,
  EWAY_USERPASSWORD
} = process.env;

if (!EWAY_SOAP_WSDL_URL || !EWAY_CUSTOMERID || !EWAY_USERNAME || !EWAY_USERPASSWORD) {
  throw new Error('❌ Missing SOAP credentials in .env');
}

// 🔌 Create SOAP Client
const createSoapClient = async () => {
  return new Promise((resolve, reject) => {
    soap.createClient(EWAY_SOAP_WSDL_URL, (err, client) => {
      if (err) return reject(err);
      client.setSecurity(new soap.BasicAuthSecurity(EWAY_USERNAME, EWAY_USERPASSWORD));
      resolve(client);
    });
  });
};

// ✅ Step 1: Create Rebill Customer
const createRebillCustomer = async (customer) => {
  const client = await createSoapClient();

  const args = {
    CustomerID: EWAY_CUSTOMERID,
    Title: customer.title || '',
    FirstName: customer.FirstName || customer.firstName,
    LastName: customer.LastName || customer.lastName,
    Address: customer.address || '',
    Suburb: customer.suburb || '',
    State: customer.state || '',
    Company: customer.company || '',
    PostCode: customer.postcode || '',
    Country: customer.country || 'AU',
    Email: customer.Email || customer.email,
    Fax: customer.fax || '',
    Phone: customer.phone || '',
    Mobile: customer.mobile || '',
    CustomerRef: customer.customerRef || '',
    JobDesc: customer.jobDesc || '',
    Comments: customer.comments || '',
    URL: customer.url || ''
  };

  try {
    const result = await client.CreateRebillCustomer(args);
    const rebillCustomerID = result?.CreateRebillCustomerResult;
    return { success: true, rebillCustomerID };
  } catch (err) {
    console.error("❌ createRebillCustomer Error:", err.message || err);
    return { success: false, error: err.message || err };
  }
};

// ✅ Step 2: Trigger Initial Payment
const triggerInitialRebillPayment = async ({ rebillCustomerID, amount }) => {
  const client = await createSoapClient();

  const args = {
    CustomerID: EWAY_CUSTOMERID,
    RebillCustomerID: rebillCustomerID,
    Amount: amount, // In cents
    Currency: 'AUD',
    InvoiceDescription: 'Initial Subscription Payment',
    InvoiceReference: `INIT-${Date.now()}`
  };

  try {
    const result = await client.ProcessPayment(args);
    return {
      success: true,
      transactionId: result?.ProcessPaymentResult,
      raw: result
    };
  } catch (err) {
    console.error("❌ triggerInitialRebillPayment Error:", err.message || err);
    return { success: false, error: err.message || err };
  }
};

// ✅ Step 3: Set Recurring Schedule
const createRebillSchedule = async ({ rebillCustomerID, startDate, intervalMonths = 1, occurrences = 12, amount }) => {
  const client = await createSoapClient();

  const formattedDate = startDate.toISOString().split('T')[0]; // yyyy-mm-dd

  const args = {
    CustomerID: EWAY_CUSTOMERID,
    RebillCustomerID: rebillCustomerID,
    RebillInitDate: formattedDate,
    RebillInterval: intervalMonths,
    RebillIntervalType: 'monthly',
    RebillEndDate: '', // leave empty if you want indefinite
    RebillAmount: amount, // In cents
    RebillCurrency: 'AUD'
  };

  try {
    const result = await client.CreateRebillEvent(args);
    return {
      success: true,
      result: result?.CreateRebillEventResult,
      nextDate: formattedDate
    };
  } catch (err) {
    console.error("❌ createRebillSchedule Error:", err.message || err);
    return { success: false, error: err.message || err };
  }
};

module.exports = {
  createRebillCustomer,
  triggerInitialRebillPayment,
  createRebillSchedule
};
