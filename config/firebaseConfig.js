// const admin = require("firebase-admin");
// const serviceAccount = require("./trade-hunter-873e9-firebase-adminsdk-fbsvc-ef94b3484d.json"); // Downloaded from Firebase Console
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });
// module.exports = admin;


const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert(process.env.SECRET_NAME),
});

module.exports = admin;