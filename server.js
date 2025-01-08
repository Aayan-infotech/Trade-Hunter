const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");



dotenv.config();
const app = express();
const PORT = process.env.PORT || 7777;

app.use(cors());
app.use(express.json());

connectDB();
const apiRoutes = require("./apiRoutes");
const authAdmin = require("./routes/authAdmin");
const userRoutes = require("./routes/userRoutes");




app.use('/api', apiRoutes);
app.use('/api/authAdmin', authAdmin);
app.use('/api/users', userRoutes);


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
