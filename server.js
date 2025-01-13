const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
dotenv.config();
const app = express();
const PORT = process.env.PORT || 7777;

// S3 Configuration (For AWS)
// aws.config.update({
//   accessKeyId: process.env.AWS_ACCESS_KEY,
//   secretAccessKey: process.env.AWS_SECRET_KEY,
//   region: process.env.AWS_REGION,
// });

// const s3 = new aws.S3();

// // Multer S3 Setup
// const upload = multer({
//   storage: multerS3({
//     s3: s3,
//     bucket: process.env.AWS_S3_BUCKET_NAME,
//     key: function (req, file, cb) {
//       cb(null, `uploads/${Date.now().toString()}-${file.originalname}`);
//     },
//   }),
// });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For URL-encoded data

connectDB();
const apiRoutes = require("./apiRoutes");
const authAdmin = require("./AdmRts/authAdmin");
const userRoutes = require("./AdmRts/userRoutes");

app.use("/api", apiRoutes);
app.use("/api/authAdmin", authAdmin);
app.use("/api/users", userRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
