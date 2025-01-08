const express=require("express")
const authroutes=require("./routes/authRoutes")
const serviceRoutes=require("./routes/serviceRoutes")
const providerRoutes=require("./routes/providerRoutes")

const router = express.Router();

router.use("/auth",authroutes)
router.use("/service",serviceRoutes)
router.use("/provider",providerRoutes)

module.exports = router;