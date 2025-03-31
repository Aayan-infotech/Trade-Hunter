const express = require("express");
const bodyParser = require('body-parser');
const dotenv = require("dotenv");
const cors = require("cors");
const multer = require("multer");
const connectDB = require("./config/db");
dotenv.config();
const app = express();
const PORT = process.env.PORT || 7777;


app.use(express.json());
app.use(express.urlencoded({ extended: true })); 
app.use(bodyParser.json());// For URL-encoded data
app.use(cors());
const upload = multer();





connectDB();
require("./middlewares/cron"); // 🔥 Import cron job

const apiRoutes = require("./apiRoutes");
const authAdmin = require("./AdmRts/authAdmin");
const userRoutes = require("./AdmRts/userRoutes");
const providerRts = require("./AdmRts/providerRts");
const hunterRts = require("./routes/hunterRoute")
const jobRts = require("./AdmRts/jobRts")
const notificationRts = require("./AdmRts/notificationRts")
const dashboardRts = require("./AdmRts/dashboardRts")
const softDeleteRoute = require("./routes/softDeleteRoute")
const StaticContentRoutes = require("./AdmRts/StaticContentRoutes")
const massNotifcationRts = require("./AdmRts/massNotificationRts")
const contactUsRts = require("./AdmRts/contactUsRts");
const notificationAccept = require("./routes/notificationAcceptRoutes")
const devicetokenRoute = require("./routes/devicetokenRoute")
const pushNotificationRoutes = require("./routes/pushNotificationRoutes")
const matchRoutes = require("./routes/matchRoutes")
const SubscriptionNewRoute = require("./routes/SubscriptionNewRoute")
const transactionRoutes = require("./routes/transactionRoutes")
const voucherRoutes = require("./routes/voucherRoutes")
// const voucherRoutes = require("./routes/voucherRoutes")
const backgroundImgRoutes = require("./routes/backgroundImgRoutes")
const profilePhotoRoutes = require("./routes/profilePhotoRoute")
const blogRoute  = require("./routes/blogRoute")


app.use("/api", apiRoutes);
app.use("/api/authAdmin", authAdmin);
app.use("/api/users", userRoutes);
app.use("/api/Prvdr", providerRts);
app.use("/api/hunter", hunterRts);
app.use("/api/jobs", jobRts)
app.use("/api/notification",notificationRts);
app.use("/api/count",dashboardRts)
app.use("/api/DeleteAccount",softDeleteRoute)
app.use("/api/StaticContent",StaticContentRoutes)
app.use("/api/massNotification",massNotifcationRts)
app.use("/api/contact", contactUsRts);
app.use("/api/notificationAccept", notificationAccept);
app.use("/api/devicetoken", devicetokenRoute);
app.use("/api/pushNotification", pushNotificationRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/SubscriptionNew", SubscriptionNewRoute);
app.use("/api/demoTransaction", transactionRoutes);
app.use("/api/voucher", voucherRoutes);
app.use("/api/backgroundImg", backgroundImgRoutes);
app.use("/api/providerPhoto", profilePhotoRoutes)

app.use("/api/blog", blogRoute)


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
  