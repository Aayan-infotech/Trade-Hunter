const mongoose = require("mongoose");
const Rating = require("../models/ratingModel");
const hunter = require("../models/hunterModel"); 
const Provider = require("../models/providerModel");

exports.giveRating = async (req, res) => {
  try {
    const { userId } = req.user;
    const { providerId } = req.params;
    const { rating, review } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User not found." });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId." });
    }

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({ message: "Invalid providerId." });
    }

    if (rating == null || !review.trim()) {
      return res.status(400).json({ message: "Rating and review are required." });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }

    const newRating = new Rating({
      userId, 
      providerId,
      rating,
      review,
    });

    await newRating.save();

    return res.status(201).json({
      message: "Rating submitted successfully.",
      data: newRating,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.giveRating = async (req, res) => {
  try {
    const { userId } = req.user;
    const { providerId } = req.params;
    const { rating, review } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User not found." });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId." });
    }

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({ message: "Invalid providerId." });
    }

    if (rating == null || !review.trim()) {
      return res.status(400).json({ message: "Rating and review are required." });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }

    const newRating = new Rating({
      userId, 
      providerId,
      rating,
      review,
    });

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
    const { providerId } = req.params; 

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({ message: "Invalid providerId." });
    }

    const providerRatings = await Rating.find({ providerId })
      .populate("userId", "name email images") 
      .populate("providerId", "contactName email images"); 

    return res.status(200).json({
      message: "Ratings retrieved successfully.",
      providerRatings,
    });

  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.getAvgRating = async (req, res) => {
    try {
      const { providerId } = req.params;
  
      if (!mongoose.Types.ObjectId.isValid(providerId)) {
        return res.status(400).json({ message: "Invalid providerId." });
      }

      const result = await Rating.aggregate([
        { $match: { providerId: new mongoose.Types.ObjectId(providerId) } },
        { 
          $group: { 
            _id: "$providerId", 
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
  


