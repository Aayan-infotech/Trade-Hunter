const JobPost = require("../models/jobpostModel");
const apiResponse = require("../utils/responsehandler");
const hunter = require("../models/hunterModel");
const auth = require("../middlewares/auth");
const mongoose  =  require('mongoose');
const Provider = require('../models/providerModel');

const createJobPost = async (req, res) => {
  try {
    const {
      title,
      longitude,
      latitude,
      jobRadius,
      jobAddressLine,
      estimatedBudget,
      businessType,
      services,
      requirements,
    } = req.body;

    const userId = req.user.userId;
    const documents = req.files || [];

    // Correctly structure jobLocation
    const jobLocation = {
      location: {
        type: "Point", // Ensure type is set here
        coordinates: [
          parseFloat(longitude), // Longitude
          parseFloat(latitude), // Latitude
        ],
      },
      jobAddressLine: jobAddressLine,
      jobRadius: parseFloat(jobRadius),
    };

    // Parse timeframe (Ensure numeric values)
    const timeframeRaw = req.body.timeframe;
    const timeframe = {
      from: Number(timeframeRaw?.from),
      to: Number(timeframeRaw?.to),
    };

    // Validate required fields
    if (
      !title ||
      !jobLocation.location.coordinates[0] ||
      !jobLocation.location.coordinates[1] ||
      !jobLocation.jobAddressLine ||
      !jobLocation.jobRadius ||
      !estimatedBudget ||
      !businessType ||
      !services ||
      !timeframe.from ||
      !timeframe.to ||
      !requirements
    ) {
      return res.status(400).json({
        error: "All fields are required",
      });
    }

    // Create new job post object
    const jobPost = new JobPost({
      title,
      jobLocation, 
      estimatedBudget,
      businessType,
      services,
      timeframe,
      documents: req.fileLocations,
      requirements,
      user: userId,
      jobStatus: "Pending",
    });

    // Save the job post in the database
    await jobPost.save();

    return res.status(201).json({
      message: "Job post created successfully.",
      jobPost,
    });
  } catch (error) {
    console.error("Error creating job post:", error);
    return res.status(500).json({
      error: error.message,
    });
  }
};

const getAllJobPosts = async (req, res) => {
  try {
    const jobPosts = await JobPost.find();
    return apiResponse.success(
      res,
      "Job posts retrieved successfully.",
      jobPosts
    );
  } catch (error) {
    return apiResponse.error(res, "Internal server error.", 500, {
      error: error.message,
    });
  }
};

const getJobPostById = async (req, res) => {
  try {
    const jobPost = await JobPost.findById(req.params.id);
    if (!jobPost) {
      return apiResponse.error(res, "Job post not found.", 404);
    }
    return apiResponse.success(
      res,
      "Job post retrieved successfully.",
      jobPost
    );
  } catch (error) {
    return apiResponse.error(res, "Internal server error.", 500, {
      error: error.message,
    });
  }
};

const updateJobPost = async (req, res) => {
  try {
    const updates = req.body;

    // Update images if new files are uploaded
    if (req.fileLocations) {
      updates.images = req.fileLocations;
    }

    const jobPost = await JobPost.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });

    if (!jobPost) {
      return apiResponse.error(res, "Job post not found.", 404);
    }

    return apiResponse.success(res, "Job post updated successfully.", jobPost);
  } catch (error) {
    return apiResponse.error(res, "Internal server error.", 500, {
      error: error.message,
    });
  }
};

const deleteJobPost = async (req, res) => {
  try {
    const jobPost = await JobPost.findByIdAndDelete(req.params.id);
    if (!jobPost) {
      return apiResponse.error(res, "Job post not found.", 404);
    }
    return apiResponse.success(res, "Job post deleted successfully.");
  } catch (error) {
    return apiResponse.error(res, "Internal server error.", 500, {
      error: error.message,
    });
  }
};

const getAllPendingJobPosts = async (req, res) => {
  try {
    const jobPosts = await JobPost.find({ jobStatus: "Pending" });
    console.log("jobPosts", jobPosts);

    if (!jobPosts || jobPosts.length === 0) {
      return res.status(200).json({
        success: true,
        status: 200,
        message: "Job posts fetched successfully!",
        data: jobPosts,
      });
    }
    return apiResponse.success(
      res,
      "All pending Job posts retrieved successfully.",
      jobPosts
    );
  } catch (error) {
    return apiResponse.error(res, "Internal server error.", 500, {
      error: error.message,
    });
  }
};

const getJobPostByUserId = async (req, res) => {
  const userId = req.user.userId;

    // Get page & limit from query params, set defaults
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10; 
    let skip = (page - 1) * limit; 

  try {
    const totalJobs = await JobPost.countDocuments({ user: userId });
    const jobPosts = await JobPost.find({ user: userId })
      .skip(skip)
      .limit(limit);
    if (!jobPosts || jobPosts.length === 0) {
      return res.status(200).json({
        success: true,
        status: 200,
        message: "Job posts fetched successfully!",
        data: jobPosts,
      });
    }
    return res.status(200).json({
      success: true,
      status: 200,
      message: "Job posts retrieved successfully.",
      data: jobPosts,
      pagination: {
        totalJobs,
        currentPage: page,
        totalPages: Math.ceil(totalJobs / limit),
      },
    });
  } catch (error) {
    return apiResponse.error(res, "Internal server error.", 500, {
      error: error.message,
    });
  }
};

const changeJobStatus = async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const { jobStatus } = req.body;
    const user = req.user.userId;


    const provider = await Provider.findById(user);
    if(!provider){
      return res.status(404).json({
        success: false,
        status: 404,
        message: "Provider not found!"
      });
    }

    const allowedStatuses = ["Pending", "Accepted", "Completed"];

    // Validate if jobId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ error: "Invalid Job ID format" });
    }

    // Validate jobStatus
    if (!allowedStatuses.includes(jobStatus)) {
      return res.status(400).json({
        error: "Invalid job status. Allowed values: Pending, Accepted, Completed",
      });
    }

    // Find job post by ID
    const jobPost = await JobPost.findById(jobId);
    if (!jobPost) {
      return res.status(404).json({ error: "Job post not found" });
    }

    // Update job status
    jobPost.jobStatus = jobStatus;

    await jobPost.save();

        // If job is accepted, store jobId in user's acceptedJobs array
        if (jobStatus === "Accepted") {
          if (!provider.myServices.includes(jobId)) {
            provider.myServices.push(jobId);
            await provider.save();
          }
        }
    
    return res.status(200).json({
      message: "Job status changed successfully",
      status: 200,
      jobPost,
    });
  } catch (error) {
    console.error("Error updating job status:", error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createJobPost,
  getAllJobPosts,
  getJobPostById,
  updateJobPost,
  deleteJobPost,
  getAllPendingJobPosts,
  getJobPostByUserId,
  changeJobStatus,
};