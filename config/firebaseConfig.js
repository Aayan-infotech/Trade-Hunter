const admin = require("firebase-admin");
// const serviceAccount = require("./add data"); // Downloaded from Firebase Console
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
module.exports = admin;