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
        error: "All fields are required",
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
    if (!provider) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: "Provider not found!",
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
        error:
          "Invalid job status. Allowed values: Pending, Accepted, Completed",
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

    // If job is accepted, store jobId in provider's accepted jobs array
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

    const jobPost = await JobPost.findById(jobId);
    if (!jobPost) {
      return res.status(404).json({ message: "Job post not found." });
    }

    if (jobPost.user.toString() !== hunterId) {
      return res.status(403).json({ message: "Unauthorized: You are not the owner of this job post." });
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

    jobPost.provider = provider._id;
    jobPost.jobStatus = "Assigned";
    await jobPost.save();

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
        job: jobPost,
        hunter: {
          _id: hunter._id,
          name: hunter.name,
          email: hunter.email,
        },
        provider: {
          _id: provider._id,
          contactName: provider.contactName,
          email: provider.email,
          jobsAssigned: provider.assignedJobs
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
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
  jobProviderAccept
};
