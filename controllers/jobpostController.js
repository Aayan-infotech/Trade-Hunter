const JobPost = require("../models/jobpostModel");
const apiResponse = require("../utils/responsehandler");
const User = require("../models/userModel");

const createJobPost = async (req, res) => {
  try {
    const {
      title,
      location: locationRaw,
      estimatedBudget,
      businessType,
      services,
      timeframe: timeframeRaw,
      requirements,
    } = req.body;

    const userId = req.user.userId;

    const documents = req.files || [];

    // Parse location and timeframe
    const location = {
      joblatitude: parseFloat(locationRaw?.joblatitude),
      joblongitude: parseFloat(locationRaw?.joblongitude),
      jobaddress: locationRaw?.jobaddress,
      jobradius: parseFloat(locationRaw?.jobradius),
    };

    // Convert to  timestamps
    const convertedTimeframe = {
      from: Math.floor(new Date(timeframeRaw?.from).getTime() / 1000),
      to: Math.floor(new Date(timeframeRaw?.to).getTime() / 1000),
    };

    // Validate required fields
    if (
      !title ||
      !location.joblatitude ||
      !location.joblongitude ||
      !location.jobaddress ||
      !location.jobradius ||
      !estimatedBudget ||
      !businessType ||
      !services ||
      !convertedTimeframe.from ||
      !convertedTimeframe.to ||
      !requirements
    ) {
      return res.status(400).json({
        error: "All fields are required",
      });
    }

    // Validate serviceType and service
    // const validServices = [
    //   "Cleaning",
    //   "Plumbing",
    //   "Electrician",
    //   "Gardening",
    //   "Others",
    // ];
    // if (
    //   !validServices.includes(businessType) ||
    //   !validServices.includes(services)
    // ) {
    //   return res
    //     .status(400)
    //     .json({ error: "Invalid businessType or services value." });
    // }

    // Check if timeframe is valid
    if (new Date(convertedTimeframe.from) > new Date(convertedTimeframe.to)) {
      return res.status(400).json({
        error: "Invalid timeframe. 'From' must be earlier than 'To'.",
      });
    }

    // Create new job post object
    const jobPost = new JobPost({
      title,
      location,
      estimatedBudget,
      businessType,
      services,
      timeframe: convertedTimeframe,
      documents: req.fileLocations,
      requirements,
      user: userId,
      JobStatus: "pending",
    });

    // Save the job post in the database
    await jobPost.save();

    return res.status(201).json({
      message: "Job post created successfully.",
      jobPost,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error.",
      details: error.message,
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

module.exports = {
  createJobPost,
  getAllJobPosts,
  getJobPostById,
  updateJobPost,
  deleteJobPost,
};
