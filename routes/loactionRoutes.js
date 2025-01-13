const express = require("express");
const { getNearbyLocations } = require("../controllers/locationController");

const router = express.Router();

router.post("/get-nearby-locations", getNearbyLocations);

module.exports = router;
