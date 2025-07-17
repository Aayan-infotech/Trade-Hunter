const soap = require('soap');
const { getSecrets } = require("../utils/awsSecrets");

const createSoapClient = async () => {
  const secrets = await getSecrets(); 

  const {
    EWAY_SOAP_WSDL_URL,
    EWAY_USERNAME,
    EWAY_USERPASSWORD,
  } = secrets;

  if (!EWAY_SOAP_WSDL_URL || !EWAY_USERNAME || !EWAY_USERPASSWORD) {
    throw new Error('Missing SOAP credentials in AWS Secrets');
  }

  return new Promise((resolve, reject) => {
    soap.createClient(EWAY_SOAP_WSDL_URL, (err, client) => {
      if (err) return reject(err);
      client.setSecurity(new soap.BasicAuthSecurity(EWAY_USERNAME, EWAY_USERPASSWORD));
      resolve(client);
    });
  });
};

const createRebillCustomer = async (customer) => {
  const secrets = await getSecrets();
  const client = await createSoapClient();

  const args = {
    CustomerID: secrets.EWAY_CUSTOMERID,
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
    console.error("createRebillCustomer Error:", err.message || err);
    return { success: false, error: err.message || err };
  }
};

const triggerInitialRebillPayment = async ({ rebillCustomerID, amount }) => {
  const secrets = await getSecrets();
  const client = await createSoapClient();

  const args = {
    CustomerID: secrets.EWAY_CUSTOMERID,
    RebillCustomerID: rebillCustomerID,
    Amount: amount,
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
    console.error("triggerInitialRebillPayment Error:", err.message || err);
    return { success: false, error: err.message || err };
  }
};

// Create recurring schedule
const createRebillSchedule = async ({ rebillCustomerID, startDate, intervalMonths = 1, occurrences = 12, amount }) => {
  const secrets = await getSecrets();
  const client = await createSoapClient();

  const formattedDate = startDate.toISOString().split('T')[0];

  const args = {
    CustomerID: secrets.EWAY_CUSTOMERID,
    RebillCustomerID: rebillCustomerID,
    RebillInitDate: formattedDate,
    RebillInterval: intervalMonths,
    RebillIntervalType: 'monthly',
    RebillEndDate: '', 
    RebillAmount: amount,
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
    console.error("createRebillSchedule Error:", err.message || err);
    return { success: false, error: err.message || err };
  }
};

module.exports = {
  createRebillCustomer,
  triggerInitialRebillPayment,
  createRebillSchedule
};
