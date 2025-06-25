const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const cors = require("cors");
const multer = require("multer");
const connectDB = require("./config/db");

dotenv.config();

const app = express();
const server = http.createServer(app);
// const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
const corsOptions = {
  // origin: [
  //   'https://tradehunters.com.au/',
  //   'http://18.209.91.97:2366/'
  // ],
  origin:'https://tradehunters.com.au/',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};
const io = new Server(server, {
  cors: {
    // origin: ["http://18.209.91.97:2366","https://tradehunters.com.au"],
    corsOptions,
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 7777;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin || allowedOrigins.includes(origin)) {
//       return callback(null, true);
//     }
//     return callback(new Error("CORS Not Allowed: " + origin));
//   },
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "DELETE"]
// }));

app.use(cors(corsOptions));
const upload = multer();

connectDB();
require("./middlewares/cron");
app.set("io", io);

app.use("/api/authAdmin", require("./AdmRts/authAdmin"));
app.use("/api/users", require("./AdmRts/userRoutes"));
app.use("/api/Prvdr", require("./AdmRts/providerRts"));
app.use("/api/hunter", require("./routes/hunterRoute"));
app.use("/api/jobs", require("./AdmRts/jobRts"));
app.use("/api/count", require("./AdmRts/dashboardRts"));
app.use("/api/DeleteAccount", require("./routes/softDeleteRoute"));
app.use("/api/StaticContent", require("./AdmRts/StaticContentRoutes"));
app.use("/api/massNotification", require("./AdmRts/massNotificationRts"));
app.use("/api/contact", require("./AdmRts/contactUsRts"));
app.use("/api/devicetoken", require("./routes/devicetokenRoute"));
app.use("/api/pushNotification", require("./routes/pushNotificationRoutes"));
app.use("/api/match", require("./routes/matchRoutes"));
app.use("/api/SubscriptionNew", require("./routes/SubscriptionNewRoute"));
app.use("/api/voucher", require("./routes/voucherRoutes"));
app.use("/api/backgroundImg", require("./routes/backgroundImgRoutes"));
app.use("/api/providerPhoto", require("./routes/profilePhotoRoute"));
app.use("/api/blog", require("./routes/blogRoute"));
app.use("/api/rating", require("./routes/ratingRoute"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/service", require("./routes/serviceRoutes"));
app.use("/api/provider", require("./routes/providerRoutes"));
app.use("/api/jobpost", require("./routes/jobpostRoutes"));
app.use("/api/address", require("./routes/addressRoute"));
app.use("/api/eway", require("./routes/ewayRoutes"));

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
