const express=require("express")
const { createService, getAllServices,updateService,deleteService } = require("../controllers/serviceController")
const router=express.Router()
const { verifyUser } = require("../middlewares/auth")

router.post("/createService", verifyUser,createService)
router.get("/getAllServices", getAllServices)
router.put("/editService/:id",verifyUser,  updateService)
router.delete("/delete/:id",verifyUser, deleteService)

module.exports=router