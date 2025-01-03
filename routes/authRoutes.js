const express=require("express")
const { signUp, verifyEmail, login } = require("../controllers/authController")
const router=express.Router()

router.post("/signup",signUp)
router.post("/verify-email",verifyEmail)
router.post("/login",login)


module.exports=router