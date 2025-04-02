const JobPost = require("../models/jobpostModel");
const apiResponse = require("../utils/responsehandler");
const Hunter = require("../models/hunterModel");
const auth = require("../middlewares/auth");
const mongoose = require("mongoose");
const Provider = require("../models/providerModel");
const BusinessType = require("../models/serviceModel");

const createJobPost = async (req, res) => {
  try {
    let {
      title,
      longitude,
      latitude,
      jobRadius,
      city,
      jobAddressLine,
      estimatedBudget,
      businessType,
      requirements,
      date,
    } = req.body;

    businessType = Array.isArray(businessType) ? businessType : [businessType];

    const userId = req.user.userId;
    const documents = req.files || [];

    const hunter = await Hunter.findById(userId);

    if (!hunter) {
      return res.status(404).json({ message: "Hunter not found" });
    }
    if (hunter.userType !== "hunter") {
      return res.status(403).json({ message: "Unauthorized: User is not a hunter" });
    }
    if (hunter.userStatus !== "Active") {
      return res.status(403).json({ message: "Unauthorized: Hunter status is not Active" });
    }

    const jobLocation = {
      city: city,
      location: {
        type: "Point",
        coordinates: [
          parseFloat(longitude), 
          parseFloat(latitude)
        ],
      },
      jobAddressLine: jobAddressLine,
      jobRadius: parseFloat(jobRadius),
    };

    const timeframeRaw = req.body.timeframe;
    const timeframe = {
      from: Number(timeframeRaw?.from),
      to: Number(timeframeRaw?.to),
    };

    if (
      !title ||
      !jobLocation.location.coordinates[0] || 
      !jobLocation.location.coordinates[1] || 
      !jobLocation.jobAddressLine || 
      !jobLocation.jobRadius || 
      !businessType || 
      !city ||
      !date || 
      !requirements
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const jobPost = new JobPost({
      title,
      jobLocation,
      estimatedBudget: estimatedBudget || null,
      businessType, 
      timeframe: timeframe.from && timeframe.to ? timeframe : null,
      documents: req.fileLocations || [],
      requirements,
      user: userId,
      jobStatus: "Pending",
      date: new Date(date),
    });

    await jobPost.save();

    return res.status(201).json({
      message: "Job post created successfully.",  
      jobPost,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
};


const getAllJobPosts = async (req, res) => {
  let page = parseInt(req.query.page) || 1;
  let limit = parseInt(req.query.limit) || 10;
  let skip = (page - 1) * limit;

  try {
    const totalJobs = await JobPost.countDocuments();

    const jobPosts = await JobPost.find().skip(skip).limit(limit);

    return apiResponse.success(res, "Job posts retrieved successfully.", {
      jobPosts,
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
    const deletingUser = req.user; 

    const jobPost = await JobPost.findByIdAndUpdate(
      req.params.id,
      { jobStatus: "Deleted" },
      { new: true }
    );

    if (!jobPost) {
      return apiResponse.error(res, "Job post not found.", 404);
    }

    return apiResponse.success(res, "Job post deleted successfully.", {
      jobPost,
      deletedBy: deletingUser,
    });
  } catch (error) {
    return apiResponse.error(res, "Internal server error.", 500, {
      error: error.message,
    });
  }
};

const getAllPendingJobPosts = async (req, res) => {
  try {
    const jobPosts = await JobPost.find({ jobStatus: "Pending" });

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
  try {
    // Log the authenticated user details for debugging
    // console.log("Authenticated user:", req.user);
    const userId = req.user.userId;
    // console.log("Querying JobPosts for userId:", userId);

    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    let skip = (page - 1) * limit;

    // Count total job posts for the user
    const totalJobs = await JobPost.countDocuments({ user: userId });
    // Retrieve paginated job posts for the user
    const jobPosts = await JobPost.find({ user: userId })
      .skip(skip)
      .limit(limit);

    // Log the retrieved job posts for debugging
    // console.log("Retrieved job posts:", jobPosts);

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
    console.error("Error in getJobPostByUserId:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

const changeJobStatus = async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const { providerId, jobStatus } = req.body; 

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ error: "Invalid Job ID format" });
    }

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({ error: "Invalid Provider ID format" });
    }

    const provider = await Provider.findOne({ _id: providerId, isDeleted: false });
    if (!provider) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: "Provider not found!",
      });
    }

    const jobPost = await JobPost.findById(jobId);
    if (!jobPost) {
      return res.status(404).json({ error: "Job post not found" });
    }

    if (jobPost.jobStatus === "Pending") {
      jobPost.jobStatus = "Assigned";
      jobPost.provider = provider._id;
    } else if (jobPost.jobStatus === "Assigned") {
      jobPost.jobStatus = "Completed";
    } else {
      if (jobStatus) {
        jobPost.jobStatus = jobStatus;
      }
    }

    await jobPost.save();

    if (jobPost.jobStatus === "Assigned") {
      if (!provider.assignedJobs.includes(jobId)) {
        provider.assignedJobs.push(jobId);
        await provider.save();
      }
    }

    return res.status(200).json({
      message: "Job status changed successfully",
      status: 200,
      jobPost,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


const myAcceptedJobs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Fetch only required fields from the Provider model
    const user = await Provider.findById(req.user.userId)
      .select("myServices")
      .lean();

    if (!user?.myServices?.length) {
      return res.status(404).json({ message: "No jobs found" });
    }

    // Extract unique job IDs
    const jobIds = [...new Set(user.myServices.map((s) => s.toString()))];

    // Fetch total job count and paginated jobs in parallel
    const [totalJobs, jobs] = await Promise.all([
      JobPost.countDocuments({ _id: { $in: jobIds } }),
      JobPost.find({ _id: { $in: jobIds } })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      status: 200,
      message: "Jobs fetched successfully",
      jobs,
      pagination: {
        totalJobs,
        totalPages: Math.ceil(totalJobs / limit),
        currentPage: page,
      },
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const businessTypes = async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    if (!lat || !lng || !radius) {
      return res.status(400).json({
        status: 400,
        message: "Latitude, longitude, and radius are required.",
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const maxDistance = parseFloat(radius);

    const jobCounts = await JobPost.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] },
          distanceField: "distance",
          maxDistance: maxDistance,
          spherical: true,
        },
      },
      {
        $addFields: {
          businessTypeArray: {
            $cond: {
              if: { $isArray: "$businessType" },
              then: "$businessType",
              else: ["$businessType"],
            },
          },
        },
      },
      { $unwind: "$businessTypeArray" },
      {
        $group: {
          _id: "$businessTypeArray",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          name: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    const allBusinessTypes = await BusinessType.find({}, { _id: 0, name: 1 }).lean();

    const jobCountMap = {};
    for (const jc of jobCounts) {
      jobCountMap[jc.name] = jc.count;
    }
    const result = allBusinessTypes.map((bt) => ({
      name: bt.name,
      count: jobCountMap[bt.name] || 0,
    }));
    
    result.sort((a, b) => b.count - a.count);

    return res.status(200).json({
      status: 200,
      message: "Job counts by business type retrieved successfully.",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({ status: 500, error: error.message });
  }
};

const getJobPostingTrends = async (req, res) => {
  try {
    const now = new Date();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const startOfNextWeek = new Date(startOfWeek);
    startOfNextWeek.setDate(startOfWeek.getDate() + 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const dailyCount = await JobPost.countDocuments({
      createdAt: { $gte: startOfToday, $lt: startOfTomorrow }
    });

    const weeklyCount = await JobPost.countDocuments({
      createdAt: { $gte: startOfWeek, $lt: startOfNextWeek }
    });

    const monthlyCount = await JobPost.countDocuments({
      createdAt: { $gte: startOfMonth, $lt: startOfNextMonth }
    });

    return apiResponse.success(res, "Job posting trends retrieved successfully.", {
      dailyCount,
      weeklyCount,
      monthlyCount
    });
  } catch (error) {
    return apiResponse.error(
      res,
      "Error retrieving job posting trends.",
      500,
      { error: error.message }
    );
  }
};
const getTopBusinessTypes = async (req, res) => {
  try {
    const topBusinessTypes = await JobPost.aggregate([
      {
        $addFields: {
          businessTypeArray: {
            $cond: {
              if: { $isArray: "$businessType" },
              then: "$businessType",
              else: ["$businessType"]
            }
          }
        }
      },
      { $unwind: "$businessTypeArray" },
      {
        $group: {
          _id: "$businessTypeArray",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 4 },
      {
        $project: {
          _id: 0,
          businessType: "$_id",
          count: 1
        }
      }
    ]);
    
    return apiResponse.success(res, "Top four business types retrieved successfully.", topBusinessTypes);
  } catch (error) {
    return apiResponse.error(res, "Error retrieving top business types.", 500, { error: error.message });
  }
};

const getTopDemandedCities = async (req, res) => {
  try {
    const topCities = await JobPost.aggregate([
      {
        $project: {
          normalizedCity: {
            $trim: {
              input: { $toLower: "$jobLocation.city" },
              chars: " "
            }
          }
        }
      },
      {
        $group: {
          _id: "$normalizedCity",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 3
      },
      {
        $project: {
          _id: 0,
          city: "$_id",
          count: 1
        }
      }
    ]);

    return apiResponse.success(res, "Top 3 high demand cities", topCities);
  } catch (error) {
    return apiResponse.error(res, "Error retrieving top demanded cities.", 500, { error: error.message });
  }
};
const jobProviderAccept = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { providerId } = req.body;

    if (!providerId) {
      return res.status(400).json({ message: "Provider ID is required." });
    }

    const hunterId = req.user.userId;

    // Find the job post and verify ownership and status
    const jobPost = await JobPost.findById(jobId);
    if (!jobPost) {
      return res.status(404).json({ message: "Job post not found." });
    }

    if (jobPost.user.toString() !== hunterId) {
      return res
        .status(403)
        .json({ message: "Unauthorized: You are not the owner of this job post." });
    }

    if (jobPost.jobStatus !== "Pending") {
      return res.status(400).json({ message: "Job cannot be accepted. Only pending jobs can be accepted." });
    }

    const provider = await Provider.findById(providerId);
    if (!provider) {
      return res.status(404).json({ message: "Provider not found." });
    }

    const hunter = await Hunter.findById(hunterId);
    if (!hunter) {
      return res.status(404).json({ message: "Hunter not found." });
    }

    // Update the job post with the provider id and change the status atomically using $set
    const updatedJobPost = await JobPost.findByIdAndUpdate(
      jobId,
      { $set: { provider: provider._id, jobStatus: "Assigned" } },
      { new: true, runValidators: true }
    );

    // Update provider's assignedJobs if not already added
    if (!provider.assignedJobs) {
      provider.assignedJobs = [];
    }
    if (!provider.assignedJobs.includes(jobId)) {
      provider.assignedJobs.push(jobId);
      await provider.save();
    }

    return res.status(200).json({
      message: "Provider accepted successfully.",
      data: {
        job: updatedJobPost,
        hunter: {
          _id: hunter._id,
          name: hunter.name,
          email: hunter.email,
        },
        provider: {
          _id: provider._id,
          contactName: provider.contactName,
          email: provider.email,
          jobsAssigned: provider.assignedJobs,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};




const getJobCountByBusinessType = async (req, res) => {
  try {
    const jobCounts = await JobPost.aggregate([
      {
        $addFields: {
          businessTypeArray: {
            $cond: {
              if: { $isArray: "$businessType" },
              then: "$businessType",
              else: ["$businessType"],
            },
          },
        },
      },
      { $unwind: "$businessTypeArray" },
      {
        $group: {
          _id: "$businessTypeArray",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          name: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);
    const allBusinessTypes = await BusinessType.find({}, { _id: 0, name: 1 }).lean();

    const jobCountMap = {};
    for (const jc of jobCounts) {
      jobCountMap[jc.name] = jc.count;
    }
    const result = allBusinessTypes.map((bt) => ({
      name: bt.name,
      count: jobCountMap[bt.name] || 0,
    }));

    result.sort((a, b) => b.count - a.count);

    return res.status(200).json({
      status: 200,
      message: "Job counts by business type retrieved successfully.",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({ status: 500, error: error.message });
  }
};


const jobsByBusinessType = async (req, res) => {
  try {
    const { lat, lng, businessType } = req.query;
    if (!lat || !lng || !businessType) {
      return res.status(400).json({
        status: 400,
        message: "Latitude, longitude, and businessType are required.",
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    const jobs = await JobPost.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] },
          distanceField: "distance",
          spherical: true,
        },
      },
      {
        $addFields: {
          businessTypeArray: {
            $cond: {
              if: { $isArray: "$businessType" },
              then: "$businessType",
              else: ["$businessType"],
            },
          },
        },
      },
      {
        $match: {
          businessTypeArray: businessType,
        },
      },
      {
        $sort: { distance: 1 },
      },
    ]);

    return res.status(200).json({
      status: 200,
      message: "Jobs retrieved successfully.",
      data: jobs,
    });
  } catch (error) {
    return res.status(500).json({ status: 500, error: error.message });
  }
};


const incrementJobAcceptCount = async (req, res) => {
  try {
      const { jobId } = req.params;
      const { providerId } = req.body; 

      const job = await JobPost.findById(jobId);
      if (!job) {
          return res.status(404).json({ status: 404, message: "Job not found" });
      }

      if (!Array.isArray(job.jobAcceptCount)) {
          job.jobAcceptCount = [];
          job.markModified('jobAcceptCount');
      }

      if (job.jobAcceptCount.some(item => item.providerId && item.providerId.equals(providerId))) {
          return res.status(400).json({ 
              status: 400, 
              message: "you had already applied for this job please go to chat section" 
          });
      }

      if (job.jobAcceptCount.length >= 4) {
          return res.status(400).json({ status: 400, message: "Job accept limit reached (4)" });
      }

      job.jobAcceptCount.push({ providerId });
      await job.save();

      res.status(200).json({ 
          status: 200, 
          message: "Job accept count incremented", 
          jobAcceptCount: job.jobAcceptCount 
      });
  } catch (error) {
      res.status(500).json({ status: 500, message: "Internal server error", error: error.message });
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
  myAcceptedJobs,
  getJobCountByBusinessType,  
  getJobPostingTrends,
  getTopBusinessTypes,
  getTopDemandedCities,
  jobProviderAccept,
  businessTypes,
  jobsByBusinessType,
  deleteJobPost,
  incrementJobAcceptCount,
};
