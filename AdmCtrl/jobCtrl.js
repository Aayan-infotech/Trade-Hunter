const JobPost = require("../models/jobpostModel");
const apiResponse = require("../utils/responsehandler");
const mongoose = require("mongoose");

const getAllJobPosts = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const status = req.query.status || "";
  const overrideTotal = parseInt(req.query.total, 10) || 0;

  try {
    // 1) Build initial pipeline for lookups & filters
    let pipeline = [];

    pipeline.push({
      $lookup: {
        from: "hunters",
        localField: "user",
        foreignField: "_id",
        as: "userDetails",
      },
    });
    pipeline.push({
      $unwind: {
        path: "$userDetails",
        preserveNullAndEmptyArrays: true,
      },
    });

    pipeline.push({
      $addFields: {
        providerObjectId: { $toObjectId: "$provider" },
      },
    });

    pipeline.push({
      $lookup: {
        from: "providers",
        localField: "providerObjectId",
        foreignField: "_id",
        as: "providerDetails",
      },
    });
    pipeline.push({
      $unwind: {
        path: "$providerDetails",
        preserveNullAndEmptyArrays: true,
      },
    });

    // 1.1) Search filter
    if (search.trim()) {
      pipeline.push({
        $match: {
          $or: [
            { "userDetails.name": { $regex: search, $options: "i" } },
            { "jobLocation.jobAddressLine": { $regex: search, $options: "i" } },
            { "providerDetails.businessName": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // 1.2) Status filter
    if (status.trim()) {
      pipeline.push({
        $match: { jobStatus: status },
      });
    }

    // 2) Count how many match so far
    const countPipeline = [...pipeline, { $count: "totalJobs" }];
    const countResult = await JobPost.aggregate(countPipeline);
    const actualTotal = countResult[0] ? countResult[0].totalJobs : 0;

    // 3) Decide effectiveTotal based on override
    let effectiveTotal = actualTotal;
    if (overrideTotal > 0) {
      effectiveTotal = Math.min(actualTotal, overrideTotal);
    }

    // 4) If overrideTotal > 0, cap the pipeline
    if (overrideTotal > 0) {
      pipeline.push({ $limit: effectiveTotal });
    }

    // 5) Sort & paginate
    pipeline.push({ $sort: { createdAt: -1 } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // 6) Project fields
    pipeline.push({
      $project: {
        title: 1,
        jobLocation: 1,
        estimatedBudget: 1,
        businessType: 1,
        date: 1,
        timeframe: 1,
        documents: 1,
        requirements: 1,
        jobStatus: 1,
        jobAssigned: 1,
        completionDate: 1,
        createdAt: 1,
        updatedAt: 1,
        user: {
          _id: "$userDetails._id",
          name: "$userDetails.name",
          email: "$userDetails.email",
        },
        provider: {
          _id: "$providerDetails._id",
          contactName: "$providerDetails.contactName",
          email: "$providerDetails.email",
          businessName: "$providerDetails.businessName",
        },
      },
    });

    // 7) Execute the aggregation
    const jobPosts = await JobPost.aggregate(pipeline);

    // 8) Return response with pagination based on effectiveTotal
    return apiResponse.success(res, "Job posts retrieved successfully.", {
      pagination: {
        totalJobs: effectiveTotal,
        currentPage: page,
        totalPages: Math.ceil(effectiveTotal / limit),
      },
      jobPosts,
    });
  } catch (error) {
    console.error("Error in getAllJobPosts:", error);
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

const getJobStatusCounts = async (req, res) => {
  try {
    const statusCounts = await JobPost.aggregate([
      {
        $group: {
          _id: "$jobStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    const statusMap = {
      Pending: 0,
      Assigned: 0,
      Completed: 0,
    };

    statusCounts.forEach((status) => {
      statusMap[status._id] = status.count;
    });

    const totalJobs = await JobPost.countDocuments();

    return res.status(200).json({
      success: true,
      message: "Job status counts fetched successfully",
      data: {
        status: statusMap,
        totalJobs,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const getRecentJobPosts = async (req, res) => {
  try {
    const recentJobs = await JobPost.find({ status: { $ne: "Completed" } })
      .sort({ createdAt: -1 })
      .limit(4)
      .populate({
        path: "user",
        model: "hunter",
        select: "name email",
      })
      .populate({
        path: "provider",
        model: "Provider",
        select: "contactName email businessName",
      })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Recent job posts fetched successfully",
      data: recentJobs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


const getJobPostsByStatus = async (req, res) => {
  let status = req.query.status;
  let page = parseInt(req.query.page) || 1;
  let limit = parseInt(req.query.limit) || 10;
  let skip = (page - 1) * limit;

  if (!status) {
    return res.status(400).json({ error: "Job status is required " });
  }

  const allowedStatuses = [
    "Pending",
    "Assigned",
    "Completed",
    "Deleted",
  ];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      error:
        "Invalid job status. Allowed values: Pending, Assigned, Completed, Deleted.",
    });
  }

  try {
    const query = { jobStatus: status };
    const totalJobs = await JobPost.countDocuments(query);
    const jobPosts = await JobPost.find(query)
      .skip(skip)
      .limit(limit)
      .populate("user", "name email")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Job posts retrieved successfully.",
      data: {
        pagination: {
          totalJobs,
          currentPage: page,
          totalPages: Math.ceil(totalJobs / limit),
        },
        jobPosts,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

module.exports = {
  getAllJobPosts,
  deleteJobPost,
  getJobStatusCounts,
  getRecentJobPosts,
  getJobPostsByStatus,
};
