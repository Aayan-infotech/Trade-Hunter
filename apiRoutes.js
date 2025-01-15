const express = require("express");
const authroutes = require("./routes/authRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const providerRoutes = require("./routes/providerRoutes");
const locationRoutes = require("./routes/locationRoutes");
const jobpostRoutes = require("./routes/jobpostRotes");

const router = express.Router();

router.use("/auth", authroutes);
router.use("/service", serviceRoutes);
router.use("/provider", providerRoutes);
router.use("/location",locationRoutes);
router.use("/jobpost",jobpostRoutes)

module.exports = router;