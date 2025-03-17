const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
dotenv.config();
const app = express();
const PORT = process.env.PORT || 7777;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For URL-encoded data

connectDB();
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
app.use("/api/devicetokenRoute", devicetokenRoute);
app.use("/api/pushNotificationRoutes", pushNotificationRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/SubscriptionNew", SubscriptionNewRoute);





 
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
  