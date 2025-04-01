const express = require("express");
const router = express.Router();
const ratingController = require("../controllers/ratingController");

router.post("/giveRating/:userId", ratingController.giveRating);

router.get("/getRatings/:userId", ratingController.getRatings);

module.exports = router;
