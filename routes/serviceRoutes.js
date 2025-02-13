const express=require("express")
const { createService, getAllServices,updateService,deleteService } = require("../controllers/serviceController")
const router=express.Router()

router.post("/createService",createService)
router.get("/getAllServices",getAllServices)
router.put("/editService/:id", updateService)
router.delete("/delete/:id",deleteService)

module.exports=router