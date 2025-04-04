// const admin = require("firebase-admin");
// const serviceAccount = require("./trade-hunter-873e9-firebase-adminsdk-fbsvc-ef94b3484d.json"); // Downloaded from Firebase Console
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });
// module.exports = admin;


const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");

const admin = require("firebase-admin");

const secretsManagerClient = new SecretsManagerClient({
  region: 'us-east-1',
});

const getFirebaseCredentials = async () => {
  try {
    const command = new GetSecretValueCommand({ SecretId: "trade-hunter" });
    const data = await secretsManagerClient.send(command);

    if (!data.SecretString) {
      throw new Error("No secret found in AWS Secrets Manager");
    }
    return JSON.parse(data.SecretString);
  } catch (error) {
    console.error("Failed to retrieve Firebase credentials", error);
    return null;
  }
};

const initializeFirebase = async () => {
  const serviceAccount = await getFirebaseCredentials();
  if (!serviceAccount) {
    throw new Error("Firebase service account not found in AWS Secrets Manager");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("Firebase Initialized Successfully");
};

initializeFirebase().catch((err) => {
  console.error("Firebase initialization failed", err);
});

module.exports = admin;