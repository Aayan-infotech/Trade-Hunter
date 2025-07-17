const AWS = require('aws-sdk');

const getSecrets = async () => {
  const client = new AWS.SecretsManager({ region: 'us-east-1' });

  try {
    const data = await client.getSecretValue({ SecretId: 'hunters' }).promise();
    const secret = 'SecretString' in data ? data.SecretString : Buffer.from(data.SecretBinary, 'base64').toString('ascii');
    return JSON.parse(secret);
  } catch (error) {
    console.error('Error loading AWS Secret:', error);
    throw error;
  }
};

module.exports = { getSecrets };
