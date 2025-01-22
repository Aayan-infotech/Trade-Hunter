const express=require("express")
const { createService, getAllServices } = require("../controllers/serviceController")
const router=express.Router()

router.post("/createService",createService)
router.get("/getAllServices",getAllServices)

module.exports=router