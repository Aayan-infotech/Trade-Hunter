const mongoose = require("mongoose");
const Rating = require("../models/ratingModel");

exports.giveRating = async (req, res) => {
  try {
    const { userId } = req.params;
    const { rating, review } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId." });
    }

    if (rating === undefined || !review) {
      return res.status(400).json({ message: "Rating and review are required." });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }

    const newRating = new Rating({ userId, rating, review });
    await newRating.save();

    return res.status(201).json({
      message: "Rating submitted successfully.",
      data: newRating,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getRatings = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId." });
    }

    const ratings = await Rating.find({ userId }).populate("userId", "contactName email images");

    return res.status(200).json({
      message: "Ratings retrieved successfully.",
      data: ratings,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getAvgRating = async (req, res) => {
    try {
      const { userId } = req.params;
  
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid userId." });
      }
  
      const result = await Rating.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { 
          $group: { 
            _id: "$userId", 
            avgRating: { $avg: "$rating" }, 
            totalRatings: { $sum: 1 } 
          } 
        }
      ]);
  
      if (result.length === 0) {
        return res.status(200).json({
          message: "No ratings found for the given provider.",
          data: { avgRating: 0, totalRatings: 0 }
        });
      }
  
      return res.status(200).json({
        message: "Average rating retrieved successfully.",
        data: result[0]
      });
    } catch (error) {
      return res.status(500).json({ message: "Server error", error: error.message });
    }
  };
  
