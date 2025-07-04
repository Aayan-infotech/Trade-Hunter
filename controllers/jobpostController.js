const JobPost = require("../models/jobpostModel");
const apiResponse = require("../utils/responsehandler");
const Hunter = require("../models/hunterModel");
const auth = require("../middlewares/auth");
const mongoose = require("mongoose");
const {Types} = require("mongoose");
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

    // 1) Require businessType in payload
    if (businessType == null) {
      return res.status(400).json({
        message: "Missing required field: businessType",
      });
    }

    // 2) Normalize businessType into an array
    businessType = Array.isArray(businessType)
      ? businessType
      : [businessType];

    // 3) Verify at least one businessType value
    if (businessType.length === 0) {
      return res.status(400).json({
        message: "businessType must contain at least one value",
      });
    }

    const userId   = req.user.userId;
    const documents = req.files || [];

    // 4) Ensure hunter exists and is active
    const hunter = await Hunter.findById(userId);
    if (!hunter) {
      return res.status(404).json({ message: "Hunter not found" });
    }
    if (hunter.userType !== "hunter" || hunter.userStatus !== "Active") {
      return res
        .status(403)
        .json({ message: "Unauthorized or inactive hunter account" });
    }

    // 5) Build GeoJSON location
    const jobLocation = {
      city,
      location: {
        type: "Point",
        coordinates: [
          parseFloat(longitude),
          parseFloat(latitude),
        ],
      },
      jobAddressLine,
      jobRadius: parseFloat(jobRadius),
    };

    // 6) Parse timeframe if provided
    const timeframeRaw = req.body.timeframe;
    const timeframe =
      timeframeRaw?.from && timeframeRaw?.to
        ? {
            from: Number(timeframeRaw.from),
            to:   Number(timeframeRaw.to),
          }
        : null;

    // 7) Validate all other required fields
    if (
      !title ||
      isNaN(jobLocation.location.coordinates[0]) ||
      isNaN(jobLocation.location.coordinates[1]) ||
      !jobAddressLine ||
      isNaN(jobLocation.jobRadius) ||
      !city ||
      !date ||
      !requirements
    ) {
      return res.status(400).json({
        message:
          "Missing required field(s): title, longitude, latitude, jobAddressLine, jobRadius, city, date, or requirements",
      });
    }

    // 8) Create and save the job post
    const jobPost = new JobPost({
      title,
      jobLocation,
      estimatedBudget: estimatedBudget || null,
      businessType,
      timeframe,
      documents: req.fileLocations || [],
      requirements,
      user: userId,
      jobStatus: "Pending",
      date: new Date(date),
    });

    await jobPost.save();

    // 9) Emit real-time update
    const io = req.app.get("io");
    io.emit("new Job", { jobId: jobPost._id });

    return res.status(201).json({
      message: "Job post created successfully.",
      jobPost,
    });
  } catch (error) {
    console.error("createJobPost error:", error);
    return res.status(500).json({ error: error.message });
  }
};


const getJobPostById = async (req, res) => {
  try {
    const jobPost = await JobPost.findById(req.params.id).populate("user", "name email").populate("provider", "contactName email").lean();

    if (!jobPost) {
      return apiResponse.error(res, "Job post not found.", 404);
    }

    const provider = await Provider.findById(jobPost.provider).select("contactName email").lean();

    return apiResponse.success(
      res,
      "Job post retrieved successfully.",
      jobPost,
    );
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

const getJobPostByUserId = async (req, res) => {
  try {
    const userId = req.user.userId;

    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    let skip = (page - 1) * limit;
    const search = req.query.search || "";
    const jobStatus = req.query.jobStatus; 
    const query = { user: userId };

    if (search) {
      query["title"] = { $regex: search, $options: "i" };
    }

    if (jobStatus) {
      query["jobStatus"] = jobStatus;
    }

    const totalJobs = await JobPost.countDocuments(query);
    const jobPosts = await JobPost.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

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

    const jobPost = await JobPost.findById(jobId);
    if (!jobPost) {
      return res.status(404).json({ error: "Job post not found" });
    }

    const currentStatus = jobPost.jobStatus;
    const allowedStatuses = ['Pending', 'Quoted', 'Assigned', 'Completed', 'Deleted'];

    if (!jobStatus || !allowedStatuses.includes(jobStatus)) {
      return res.status(400).json({
        error: "Invalid or missing jobStatus. Allowed values: Pending, Quoted, Assigned, Completed, Deleted",
      });
    }

    const validTransitions = {
      Pending: ['Quoted'],
      Quoted: ['Assigned'],
      Assigned: ['Completed'],
      Completed: [], 
      Deleted: [],   
    };

    if (!validTransitions[currentStatus].includes(jobStatus)) {
      return res.status(400).json({
        error: `Invalid status transition from '${currentStatus}' to '${jobStatus}'`,
      });
    }

    if (currentStatus === 'Quoted' && jobStatus === 'Assigned') {
      if (!providerId || !mongoose.Types.ObjectId.isValid(providerId)) {
        return res.status(400).json({ error: "A valid providerId is required for assignment" });
      }

      const provider = await Provider.findById(providerId);
      if (!provider) {
        return res.status(404).json({ error: "Provider not found" });
      }

      jobPost.provider = provider._id;
      if (!provider.assignedJobs.includes(jobPost._id.toString())) {
        provider.assignedJobs.push(jobPost._id);
        await provider.save();
      }
    }

    if (jobStatus === 'Completed') {
      jobPost.completionDate = new Date();
    } else {
      jobPost.completionDate = null;
    }

    jobPost.jobStatus = jobStatus;
    await jobPost.save();

    return res.status(200).json({
      message: `Job status changed to '${jobStatus}' successfully.`,
      status: 200,
      jobPost,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};



const myAcceptedJobs = async (req, res) => {
  try {
    const page      = parseInt(req.query.page, 10) || 1;
    const limit     = parseInt(req.query.limit, 10) || 10;
    const { jobStatus, search } = req.query; 

    const user = await Provider.findById(req.user.userId)
      .select('assignedJobs')
      .lean();

    if (!user?.assignedJobs?.length) {
      return res.status(200).json({
        status: 200,
        message: 'Jobs fetched successfully',
        jobs: [],
        pagination: {
          totalJobs: 0,
          totalPages: 0,
          currentPage: page,
        },
      });
    }

    const jobIds = [...new Set(
      user.assignedJobs.map(id => new mongoose.Types.ObjectId(id))
    )];

    const matchCriteria = { _id: { $in: jobIds } };

    if (jobStatus && jobStatus.trim()) {
      matchCriteria.jobStatus = jobStatus.trim();
    }

    if (search && search.trim()) {
      matchCriteria.title = { $regex: search.trim(), $options: 'i' };
    }

    const aggregation = [
      { $match: matchCriteria },
      {
        $facet: {
          totalCount: [{ $count: 'count' }],
          paginatedResults: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
          ],
        },
      },
    ];

    const jobsAgg = await JobPost.aggregate(aggregation);
    const totalJobs = jobsAgg[0]?.totalCount[0]?.count || 0;
    const jobs      = jobsAgg[0]?.paginatedResults || [];

    return res.status(200).json({
      status: 200,
      message: 'Jobs fetched successfully',
      jobs,
      pagination: {
        totalJobs,
        totalPages: Math.ceil(totalJobs / limit),
        currentPage: page,
      },
    });

  } catch (error) {
    console.error('Error fetching jobs:', error);
    return res.status(500).json({ message: 'Internal server error' });
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

    const updatedJobPost = await JobPost.findByIdAndUpdate(
      jobId,
      { $set: { provider: provider._id, jobStatus: "Assigned" } },
      { new: true, runValidators: true }
    );

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

    result.sort((a, b) => a.name.localeCompare(b.name));

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

const updateJobPost = async (req, res) => {
  try {
    const updates = { ...req.body };

    if (updates.estimatedBudget !== undefined) {
      if (updates.estimatedBudget === "null") {
        updates.estimatedBudget = null;
      } else {
        updates.estimatedBudget = Number(updates.estimatedBudget);
        if (isNaN(updates.estimatedBudget)) {
          updates.estimatedBudget = null;
        }
      }
    }

    const jobLocation = {};

    if (updates.jobAddressLine !== undefined) {
      jobLocation.jobAddressLine = updates.jobAddressLine;
      delete updates.jobAddressLine;
    }

    if (updates.city !== undefined) {
      jobLocation.city = updates.city;
      delete updates.city;
    }

    if (updates.jobRadius !== undefined) {
      jobLocation.jobRadius = Number(updates.jobRadius);
      delete updates.jobRadius;
    }

    if (updates.latitude !== undefined && updates.longitude !== undefined) {
      jobLocation.location = {
        type: 'Point',
        coordinates: [Number(updates.longitude), Number(updates.latitude)],
      };
      delete updates.latitude;
      delete updates.longitude;
    }

    if (Object.keys(jobLocation).length > 0) {
      updates.jobLocation = jobLocation;
    }
    const existingJobPost = await JobPost.findById(req.params.id);
    if (!existingJobPost) {
      return apiResponse.error(res, "Job post not found.", 404);
    }

    if (req.fileLocations && req.fileLocations.length > 0) {
      updates.documents = [
        ...(existingJobPost.documents || []),
        ...req.fileLocations,
      ];
    }

    const jobPost = await JobPost.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });

    return apiResponse.success(res, "Job post updated successfully.", jobPost);
  } catch (error) {
    console.error("Error in updateJobPost:", error);
    return apiResponse.error(res, "Internal server error.", 500, {
      error: error.message,
    });
  }
};

const completionNotified = async (req, res) => {
  try {
    const jobPost = await JobPost.findByIdAndUpdate(
      req.params.jobId,
      { completionNotified: true },
      { new: true }
    );

    if (!jobPost) {
      return apiResponse.error(res, "Job post not found.", 404);
    }

    return apiResponse.success(
      res,
      "Job post marked as completion notified.",
      jobPost
    );
  } catch (error) {
    console.error("Error in completionNotified:", error);
    return apiResponse.error(res, "Internal server error.", 500, {
      error: error.message,
    });
  }
};






module.exports = {
  createJobPost,
  getJobPostById,
  deleteJobPost,
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
  updateJobPost,
  completionNotified,
};
