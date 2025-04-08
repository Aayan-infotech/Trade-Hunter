const express = require("express");
const router = express.Router();
const ratingController = require("../controllers/ratingController");
const { verifyUser } = require("../middlewares/auth");

router.post("/giveRating/:providerId", verifyUser, ratingController.giveRating);

router.get("/getRatings/:providerId",verifyUser,  ratingController.getRatings);

router.get("/getAvgRating/:providerId",verifyUser,  ratingController.getAvgRating);

module.exports = router;
