const express=require("express")
const authroutes=require("./routes/authRoutes")
const serviceRoutes=require("./routes/serviceRoutes")

const router = express.Router();

router.use("/auth",authroutes)
router.use("/service",serviceRoutes)


module.exports = router;