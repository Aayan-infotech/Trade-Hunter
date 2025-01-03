const express=require("express")
const authroutes=require("./routes/authRoutes")

const router = express.Router();

router.use("/auth",authroutes)


module.exports = router;