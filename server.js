const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const cors = require("cors");
const multer = require("multer");
const fileUpload=require('express-fileupload');
const connectDB = require("./config/db");
const path = require('path');
const JobPost = require('./models/jobpostModel');
dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors()); 
app.options("*", cors()); 
app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

const corsOptions = {
  origin: ['https://tradehunters.com.au', 'https://admin.tradehunters.com.au','http://tradehunters.com.au', 'http://admin.tradehunters.com.au'],
  methods: ['OPTION', 'GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  credentials: true,
  optionsSuccessStatus: 204
};

const io = new Server(server, {
  cors: corsOptions 
});




const PORT = process.env.PORT || 7777;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(bodyParser.json());
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  abortOnLimit: true,
  responseOnLimit: "File size exceeds 5MB limit."
}));
app.use(express.static(path.join(__dirname, 'public')));
// app.use(cors(corsOptions));
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

app.get('/testmsg', (req,res) => {
  res.send('Hello world 1234');
});
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
  socket.on('error', (err) => {
    console.error(`Socket error from ${socket.id}:`, err);
  });
});
io.use((socket, next) => {
  console.log("Socket origin:", socket.handshake.headers.origin);
  next();
});
app.use((err, req, res, next) => {
  if (err.status === 413 || err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      message: "Payload too large. Max file size is 5MB.",
    });
  }

  return res.status(500).json({
    message: "Internal server error",
    error: err.message,
  });
});


server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
