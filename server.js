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


app.use("/api", apiRoutes);
app.use("/api/authAdmin", authAdmin);
app.use("/api/users", userRoutes);
app.use("/api/Prvdr", providerRts);
app.use("/api/hunter", hunterRts);



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
