const express = require("express");
const authroutes = require("./routes/authRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const providerRoutes = require("./routes/providerRoutes");
// const locationRoutes = require("./routes/locationRoutes");
// const testRoutes = require("./routes/testRoutes");

const router = express.Router();

router.use("/auth", authroutes);
router.use("/service", serviceRoutes);
router.use("/provider", providerRoutes);
// router.use("/location",locationRoutes)
// router.use("/test", testRoutes);

module.exports = router;
