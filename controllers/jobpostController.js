const JobPost = require("../models/jobpostModel");
const apiResponse = require("../utils/responsehandler");

const createJobPost = async (req, res) => {
  try {
    const {
      title,
      location: locationRaw,
      estimatedBudget,
      serviceType,
      service,
      timeframe: timeframeRaw,
      requirements,
    } = req.body;

    const documents = req.files || []; 

    // Parse location and timeframe
    const location = {
      joblatitude: parseFloat(locationRaw?.joblatitude),
      joblongitude: parseFloat(locationRaw?.joblongitude),
      jobaddress: locationRaw?.jobaddress,
      jobradius: parseFloat(locationRaw?.jobradius),
    };

    const timeframe = {
      from: new Date(timeframeRaw?.from),
      to: new Date(timeframeRaw?.to),
    };

    // Validate required fields
    if (
      !title ||
      !location.joblatitude ||
      !location.joblongitude ||
      !location.jobaddress ||
      !location.jobradius ||
      !estimatedBudget ||
      !serviceType ||
      !service ||
      !timeframe.from ||
      !timeframe.to ||
      !requirements
    ) {
      return res
        .status(400)
        .json({ error: "All fields are required, including location and timeframe." });
    }

    // Validate serviceType and service
    const validServices = ["Cleaning", "Plumbing", "Electrician", "Gardening", "Others"];
    if (!validServices.includes(serviceType) || !validServices.includes(service)) {
      return res.status(400).json({ error: "Invalid serviceType or service value." });
    }

    // Check if timeframe is valid
    if (new Date(timeframe.from) > new Date(timeframe.to)) {
      return res.status(400).json({ error: "Invalid timeframe. 'From' must be earlier than 'To'." });
    }

    // Create new job post object
    const jobPost = new JobPost({
      title,
      location,
      estimatedBudget,
      serviceType,
      service,
      timeframe,
      documents: req.fileLocations, 
      requirements,
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
      error: "Internal server error.",
      details: error.message,
    });
  }
};


const getAllJobPosts = async (req, res) => {
  try {
    const jobPosts = await JobPost.find();
    return apiResponse.success(res, "Job posts retrieved successfully.", jobPosts);
  } catch (error) {
    console.error("Error retrieving job posts:", error);
    return apiResponse.error(res, "Internal server error.", 500, { error: error.message });
  }
};

const getJobPostById = async (req, res) => {
  try {
    const jobPost = await JobPost.findById(req.params.id);
    if (!jobPost) {
      return apiResponse.error(res, "Job post not found.", 404);
    }
    return apiResponse.success(res, "Job post retrieved successfully.", jobPost);
  } catch (error) {
    console.error("Error retrieving job post:", error);
    return apiResponse.error(res, "Internal server error.", 500, { error: error.message });
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
    console.error("Error updating job post:", error);
    return apiResponse.error(res, "Internal server error.", 500, { error: error.message });
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
    console.error("Error deleting job post:", error);
    return apiResponse.error(res, "Internal server error.", 500, { error: error.message });
  }
};

module.exports = {
  createJobPost,
  getAllJobPosts,
  getJobPostById,
  updateJobPost,
  deleteJobPost,
};
