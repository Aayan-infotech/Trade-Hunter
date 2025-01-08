const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const apiRoutes = require("./apiRoutes");
const authAdmin = require("./routes/authAdmin");


dotenv.config();
const app = express();
const PORT = process.env.PORT || 7777;

app.use(cors());
app.use(express.json());

connectDB();

app.use('/api', apiRoutes);
app.use('/api/authAdmin', authAdmin);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
