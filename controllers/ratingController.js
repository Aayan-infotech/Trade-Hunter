const mongoose = require("mongoose");
const Rating = require("../models/ratingModel");
const hunter = require("../models/hunterModel"); 
const Provider = require("../models/providerModel");
const job = require("../models/jobpostModel");

exports.giveRating = async (req, res) => {
  try {
    const { userId } = req.user;
    const { providerId } = req.params;
    const { jobId, rating, review } = req.body;

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
      jobId,
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
    const { jobId, rating, review } = req.body;

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
      jobId,
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

    const ratingStats = result.length > 0
      ? result[0]
      : { avgRating: 0, totalRatings: 0 };

    return res.status(200).json({
      message: "Ratings retrieved successfully.",
      data: {
        providerRatings,
        avgRating: ratingStats.avgRating,
        totalRatings: ratingStats.totalRatings
      }
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



  exports.getRatingByJob = async (req, res) => {
    try {
      const { jobId } = req.params;
  
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return res.status(400).json({ message: "Invalid jobId." });
      }
  
      const ratings = await Rating.find({ jobId })
        .populate("userId", "name email images")        
        .populate("providerId", "contactName email images") 
        .populate("jobId", "title requirements");              
      return res.status(200).json({
        message: "Ratings for the job retrieved successfully.",
        data: ratings,
      });
    } catch (error) {
      console.error("Error in getRating:", error);
      return res.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  };
  

exports.getProvidersWithAvgRatings = async (req, res) => {
  try {
    const { search, avgRating } = req.query;
    const parsedAvg = avgRating ? parseFloat(avgRating) : null;

    const pipeline = [
      {
        $group: {
          _id: "$providerId",
          avgRating: { $avg: "$rating" },
          totalRatings: { $sum: 1 },
          ratings: { $push: "$$ROOT" }
        }
      },

      {
        $match: parsedAvg !== null
          ? { avgRating: { $eq: parsedAvg } }
          : {}
      },

      {
        $lookup: {
          from: "providers",
          localField: "_id",
          foreignField: "_id",
          as: "providerInfo"
        }
      },
      { $unwind: "$providerInfo" },
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "providerInfo.email":      { $regex: search, $options: "i" } },
            { "providerInfo.businessName": { $regex: search, $options: "i" } }
          ]
        }
      });
    }
    pipeline.push(
      { $unwind: "$ratings" },
      {
        $lookup: {
          from: "hunters",
          localField: "ratings.userId",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      { $addFields: { "ratings.user": { $arrayElemAt: ["$userInfo", 0] } } },
      {
        $lookup: {
          from: "jobposts",
          localField: "ratings.jobId",
          foreignField: "_id",
          as: "jobInfo"
        }
      },
      { $addFields: { "ratings.job": { $arrayElemAt: ["$jobInfo", 0] } } },

      {
        $group: {
          _id: "$_id",
          avgRating:    { $first: "$avgRating" },
          totalRatings: { $first: "$totalRatings" },
          ratings:      { $push: "$ratings" },
          providerInfo: { $first: "$providerInfo" }
        }
      },
      {
        $project: {
          providerId:  "$_id",
          businessName: "$providerInfo.businessName",
          contactName:  "$providerInfo.contactName",
          email:        "$providerInfo.email",
          avgRating:    { $round: ["$avgRating", 1] },
          totalRatings: 1,
          ratings: {
            $map: {
              input: "$ratings",
              as: "r",
              in: {
                rating:   "$$r.rating",
                review:   "$$r.review",
                createdAt:"$$r.createdAt",
                job: {
                  _id:   "$$r.job._id",
                  title: "$$r.job.title"
                },
                user: {
                  _id:   "$$r.user._id",
                  name:  "$$r.user.name",
                  email: "$$r.user.email"
                }
              }
            }
          }
        }
      }
    );

    const data = await Rating.aggregate(pipeline);

    res.status(200).json({
      message: "Provider ratings and details retrieved successfully.",
      data
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};


  
  
  


