const express = require("express");
const authroutes = require("./routes/authRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const providerRoutes = require("./routes/providerRoutes");
const jobpostRoutes = require("./routes/jobpostRotes");
const addressRoutes = require("./routes/addressRoute");
const router = express.Router();

router.use("/auth", authroutes);
router.use("/service", serviceRoutes);
router.use("/provider", providerRoutes);
router.use("/jobpost",jobpostRoutes);
router.use("/address", addressRoutes);

module.exports = router;