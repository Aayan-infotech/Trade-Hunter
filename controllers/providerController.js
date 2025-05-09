const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const providerModel = require("../models/providerModel");
const jobpostModel = require("../models/jobpostModel");
const providerPhotosModel = require("../models/providerPhotos");
const SubscriptionPlan = require("../models/SubscriptionPlanModel");
const SubscriptionVoucherUser = require("../models/SubscriptionVoucherUserModel");
const SubscriptionType = require("../models/SubscriptionTypeModel");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    if (!file || !file.originalname) {
      return cb(new Error("No file provided or file is undefined."));
    }
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 },
  fileFilter: function (req, file, cb) {
    if (!file) {
      return cb(new Error("No file provided."));
    }
    const filetypes = /jpeg|jpg|png|gif|webp|jfif|pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Error: Only images or PDF files are allowed!"));
    }
  },
}).array("file", 10);

exports.uploadFile = async (req, res) => {
  const { description } = req.body;
  const { providerId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(providerId)) {
    return res
      .status(400)
      .json({ status: 400, message: "Invalid provider id." });
  }

  try {
    const provider = await providerModel.findById(providerId).exec();
    if (!provider) {
      return res
        .status(404)
        .json({ status: 404, message: "Provider not found." });
    }
    if (!provider.userType || provider.userType.toLowerCase() !== "provider") {
      return res
        .status(403)
        .json({ status: 403, message: "Unauthorized: Not a provider." });
    }
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ status: 400, message: "Please upload at least one file." });
    }
    const filesData = req.files.map((file) => ({
      filename: file.key || file.filename,
      path: file.location || file.path,
      size: file.size,
      description: description || " ",
      uploadedAt: new Date(),
    }));

    const existingFiles = provider.files || [];
    const updatedFiles = [...existingFiles, ...filesData];

    const updatedProvider = await providerModel.findByIdAndUpdate(
      providerId,
      { files: updatedFiles },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      status: 200,
      message: "Files uploaded successfully!",
      provider: updatedProvider,
    });
  } catch (error) {
    console.error("Error in uploadFile:", error);
    return res
      .status(500)
      .json({
        status: 500,
        message: "Error saving file to the database.",
        error,
      });
  }
};

exports.deleteFile = async (req, res) => {
  const { fileId } = req.params;

  const { providerId } = req.user;

  if (!mongoose.Types.ObjectId.isValid(fileId)) {
    return res.status(400).json({ status: 400, message: "Invalid file id." });
  }

  try {
    const provider = await providerModel.findById(providerId);
    if (!provider) {
      return res
        .status(404)
        .json({ status: 404, message: "Provider not found." });
    }

    const updatedFiles = provider.files.filter(
      (file) => file.fileId.toString() !== fileId
    );

    if (updatedFiles.length === provider.files.length) {
      return res.status(404).json({ status: 404, message: "File not found." });
    }

    provider.files = updatedFiles;
    await provider.save();

    return res
      .status(200)
      .json({ status: 200, message: "File deleted successfully." });
  } catch (error) {
    console.error("Error in deleteFile:", error);
    return res
      .status(500)
      .json({ status: 500, message: "Server error.", error });
  }
};

exports.getProviderByUserLocation = async (req, res) => {
  try {
    const RADIUS_OF_EARTH = 6371;
    const { latitude, longitude, radius, offset, limit } = req.body;

    let aggregation = [];

    aggregation.push({
      $addFields: {
        distance: {
          $multiply: [
            RADIUS_OF_EARTH,
            {
              $acos: {
                $add: [
                  {
                    $multiply: [
                      { $sin: { $degreesToRadians: "$address.latitude" } },
                      { $sin: { $degreesToRadians: latitude } },
                    ],
                  },
                  {
                    $multiply: [
                      { $cos: { $degreesToRadians: "$address.latitude" } },
                      { $cos: { $degreesToRadians: latitude } },
                      {
                        $cos: {
                          $subtract: [
                            { $degreesToRadians: "$address.longitude" },
                            { $degreesToRadians: longitude },
                          ],
                        },
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
      },
    });

    aggregation.push({
      $match: {
        distance: { $lte: radius },
      },
    });

    aggregation.push({
      $facet: {
        totalData: [{ $skip: offset }, { $limit: limit }],
        total: [{ $count: "total" }],
      },
    });

    aggregation.push({
      $project: {
        totalData: 1,
        total: { $arrayElemAt: ["$total.total", 0] },
      },
    });

    const result = await providerModel.aggregate(aggregation);
    res.status(200).json({
      status: 200,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      status: 500,
    });
  }
};

exports.getServicesForGuestLocation = async (req, res) => {
  try {
    const RADIUS_OF_EARTH = 6371;
    const { latitude, longitude, radius } = req.body;

    let aggregation = [];

    aggregation.push({
      $addFields: {
        distance: {
          $multiply: [
            RADIUS_OF_EARTH,
            {
              $acos: {
                $add: [
                  {
                    $multiply: [
                      { $sin: { $degreesToRadians: "$address.latitude" } },
                      { $sin: { $degreesToRadians: latitude } },
                    ],
                  },
                  {
                    $multiply: [
                      { $cos: { $degreesToRadians: "$address.latitude" } },
                      { $cos: { $degreesToRadians: latitude } },
                      {
                        $cos: {
                          $subtract: [
                            { $degreesToRadians: "$address.longitude" },
                            { $degreesToRadians: longitude },
                          ],
                        },
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
      },
    });

    aggregation.push({
      $match: {
        distance: { $lte: radius },
      },
    });

    const result = await providerModel.aggregate(aggregation);
    res.status(200).json({
      status: 200,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      status: 500,
    });
  }
};

exports.getNearbyJobs = async (req, res) => {
  try {
    const {
      businessType,
      latitude,
      longitude,
      radius,
      page = 1,
      limit = 10,
    } = req.body;

    if (!businessType || !latitude || !longitude || !radius) {
      return res.status(400).json({
        status: 400,
        message: "Missing required fields",
      });
    }

    let businessTypeCondition;
    if (Array.isArray(businessType)) {
      businessTypeCondition = {
        $in: businessType.map((bt) => new RegExp(`^${bt}$`, "i")),
      };
    } else {
      businessTypeCondition = new RegExp(`^${businessType}$`, "i");
    }

    const jobs = await jobpostModel.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] },
          distanceField: "distance",
          maxDistance: radius,
          spherical: true,
          key: "jobLocation.location",
        },
      },
      {
        $match: {
          businessType: businessTypeCondition,
          jobStatus: "Pending",
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: limit,
      },
    ]);

    const radiusInRadians = radius / 6378100;
    const totalJobs = await jobpostModel.countDocuments({
      businessType: businessTypeCondition,
      jobStatus: "Pending",
      "jobLocation.location": {
        $geoWithin: {
          $centerSphere: [[longitude, latitude], radiusInRadians],
        },
      },
    });

    return res.status(200).json({
      status: 200,
      message: "Jobs fetched successfully",
      data: jobs,
      pagination: {
        totalJobs,
        currentPage: page,
        totalPages: Math.ceil(totalJobs / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return res.status(500).json({
      status: 500,
      message: "Error fetching jobs",
      error,
    });
  }
};

exports.getNearbyJobsForGuest = async (req, res) => {
  try {
    const { latitude, longitude, page = 1, limit = 10 } = req.body;

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ status: 400, message: "Missing required fields" });
    }

    const jobs = await jobpostModel.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] },
          distanceField: "distance",
          spherical: true,
          key: "jobLocation.location",
        },
      },
      {
        $match: {
          jobStatus: "Pending", 
        },
      },
      {
        $sort: { distance: 1 }, 
      },
      {
        $skip: (page - 1) * limit, 
      },
      {
        $limit: limit, 
      },
    ]);

    const totalJobs = await jobpostModel.countDocuments({
      jobStatus: "Pending",
    });

    return res.status(200).json({
      status: 200,
      message: "Jobs fetched successfully",
      data: jobs,
      pagination: {
        totalJobs,
        currentPage: page,
        totalPages: Math.ceil(totalJobs / limit),
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ status: 500, message: "Error fetching jobs: " + error });
  }
};

exports.getJobByIdForGuest = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res
        .status(400)
        .json({ status: 400, message: "Job ID is required" });
    }

    const job = await jobpostModel.findById(jobId);

    if (!job) {
      return res.status(404).json({ status: 404, message: "Job not found" });
    }

    return res
      .status(200)
      .json({ status: 200, message: "Job fetched successfully", data: job });
  } catch (error) {
    console.error("Error fetching job by ID:", error);
    return res
      .status(500)
      .json({ status: 500, message: "Error fetching job: " + error });
  }
};

exports.updateProviderById = async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = { ...req.body };

    console.log("Request Body:", updateData);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    if (updateData.email !== undefined) delete updateData.email;

    if (updateData.addressLine) {
      updateData["address.addressLine"] = updateData.addressLine;
      delete updateData.addressLine;
    }

    if (updateData.latitude && updateData.longitude) {
      updateData["address.location.coordinates"] = [
        Number(updateData.longitude),
        Number(updateData.latitude),
      ];
      updateData["address.location.type"] = "Point";
      delete updateData.latitude;
      delete updateData.longitude;
    }

    if (updateData.radius) {
      updateData["address.radius"] = Number(updateData.radius);
      delete updateData.radius;
    }

    if (req.fileLocations && req.fileLocations.length > 0) {
      updateData.images = req.fileLocations[0];
    }

    const updatedProvider = await providerModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedProvider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    res.status(200).json({
      message: "Provider updated successfully",
      updatedProvider,
    });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.getProviderProfile = async (req, res) => {
  try {
    const { providerId } = req.params;
    const provider = await providerModel.findById(providerId).populate({
      path: "assignedJobs",
      populate: {
        path: "user",
        select: "name email",
      },
    });

    const workgallery = await providerPhotosModel
      .findOne({ userId: providerId })
      .select("files");

    if (!provider) {
      return res
        .status(404)
        .json({ success: false, message: "Provider not found" });
    }

    res.status(200).json({
      success: true,
      message: "Provider fetched successfully",
      data: provider,
      workgallery,
    });
  } catch (error) {
    console.error("Error fetching provider profile:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.jobAcceptCount = async (req, res) => {
  try {
    const { providerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({
        status: 400,
        message: "Invalid provider id.",
      });
    }

    const provider = await providerModel.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        status: 404,
        message: "Provider not found.",
      });
    }

    if (provider.subscriptionType === "Pay Per Lead") {
      const plan = await SubscriptionPlan.findById(provider.subscriptionPlanId);
      const allowedLeads = plan?.leadCount ?? 0;
      const usedLeads = provider.leadCompleteCount || 0;

      if (usedLeads >= allowedLeads) {
        await expireSubscription(provider);
        await provider.save();
        return res.status(400).json({
          status: 400,
          message:
            "Your allotted leads have been completed. Please purchase a new plan.",
        });
      }

      provider.leadCompleteCount = usedLeads + 1;

      if (provider.leadCompleteCount > allowedLeads) {
        await expireSubscription(provider);
      }
    }

    provider.jobAcceptCount = (provider.jobAcceptCount || 0) + 1;

    await provider.save();

    return res.status(200).json({
      status: 200,
      message: "Job accept count incremented successfully!",
      jobAcceptCount: provider.jobAcceptCount,
      leadCompleteCount: provider.leadCompleteCount,
    });
  } catch (error) {
    console.error("Error in jobAcceptCount:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error",
      error: error.message,
    });
  }
};

async function expireSubscription(provider) {
  const voucher = await SubscriptionVoucherUser.findOne({
    userId: provider._id,
    subscriptionPlanId: provider.subscriptionPlanId,
  });
  if (voucher) {
    voucher.status = "expired";
    await voucher.save();
  }

  provider.subscriptionStatus = 0;
  provider.subscriptionPlanId = null;
  provider.subscriptionType = null;
  provider.leadCompleteCount = null;
  provider.address.radius = 10000;
}

exports.jobCompleteCount = async (req, res) => {
  try {
    const { providerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({
        status: 400,
        message: "Invalid provider ID.",
      });
    }

    const provider = await providerModel.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        status: 404,
        message: "Provider not found.",
      });
    }

    provider.jobCompleteCount = (provider.jobCompleteCount || 0) + 1;
    await provider.save();

    return res.status(200).json({
      status: 200,
      message: "Job complete count updated successfully.",
      jobCompleteCount: provider.jobCompleteCount,
    });
  } catch (error) {
    console.error("Error in jobCompleteCount:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.completionRate = async (req, res) => {
  try {
    const { providerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({
        status: 400,
        message: "Invalid provider id.",
      });
    }

    const provider = await providerModel.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        status: 404,
        message: "Provider not found.",
      });
    }

    const { jobAcceptCount, jobCompleteCount } = provider;
    const completionRate =
      jobAcceptCount > 0 ? (jobCompleteCount / jobAcceptCount) * 100 : 0;

    return res.status(200).json({
      status: 200,
      message: "Completion rate computed successfully!",
      completionRate: completionRate,
    });
  } catch (error) {
    console.error("Error computing completion rate:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!fileId) {
      return res.status(400).json({ message: "File ID is required." });
    }
    const providerId = req.user.userId;

    const foundProvider = await providerModel.findById(providerId);
    if (!foundProvider) {
      return res.status(404).json({ message: "Provider not found." });
    }

    if (!foundProvider.files || foundProvider.files.length === 0) {
      return res
        .status(404)
        .json({ message: "No files found for this provider." });
    }

    const initialCount = foundProvider.files.length;
    foundProvider.files = foundProvider.files.filter(
      (file) => file._id.toString() !== fileId
    );

    if (foundProvider.files.length === initialCount) {
      return res.status(404).json({ message: "File not found." });
    }

    await foundProvider.save();
    return res
      .status(200)
      .json({ status: 200, message: "File deleted successfully." });
  } catch (error) {
    return res
      .status(500)
      .json({
        status: 500,
        message: "Internal server error",
        error: error.message,
      });
  }
};

exports.getProvidersByBusinessType = async (req, res) => {
  try {
    const { lat, lng, radius, businessType } = req.body;

    if (!lat || !lng || !radius || !businessType) {
      return res.status(400).json({
        status: 400,
        message: "Latitude, longitude, radius, and businessType are required.",
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const maxDistance = parseFloat(radius);

    const businessTypesArray = Array.isArray(businessType)
      ? businessType
      : [businessType];

    const providers = await providerModel.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] },
          distanceField: "distance",
          maxDistance,
          spherical: true,
          key: "address.location",
        },
      },
      {
        $match: {
          businessType: { $in: businessTypesArray },
          subscriptionType: "Advertising",
        },
      },
      {
        $project: {
          _id: 1,
          contactName: 1,
          email: 1,
          businessName: 1,
          businessType: 1,
          address: 1,
          distance: 1,
          subscriptionType: 1,
        },
      },
    ]);

    return res.status(200).json({
      status: 200,
      message: "Providers retrieved successfully.",
      data: providers,
    });
  } catch (error) {
    return res.status(500).json({ status: 500, error: error.message });
  }
};

exports.upsertAbout = async (req, res) => {
  try {
    const { about } = req.body;
    const { id } = req.params;

    if (!about) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "About field is required",
      });
    }

    const provider = await providerModel.findByIdAndUpdate(
      id,
      { about },
      { new: true, upsert: false, select: "about" }
    );

    if (!provider) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Provider not found",
      });
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "About updated successfully",
      data: [provider],
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      success: false,
      message: "Error updating about",
      error: error.message,
    });
  }
};

exports.getAbout = async (req, res) => {
  try {
    const provider = await providerModel.findById(req.params.id, "about");

    if (!provider) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Provider not found",
      });
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "About fetched successfully",
      data: [provider],
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      success: false,
      message: "Error fetching about",
      error: error.message,
    });
  }
};

exports.getProvidersListing = async (req, res) => {
  try {
    const { lat, lng, businessType } = req.body;
    let { radius } = req.body;

    if (!lat || !lng || !businessType) {
      return res.status(400).json({
        status: 400,
        message: "Latitude, longitude, and businessType are required.",
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    radius = parseFloat(radius) || 20000;
    const businessTypesArray = Array.isArray(businessType)
      ? businessType
      : [businessType];

    const providers = await providerModel.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] },
          distanceField: "distance",
          spherical: true,
          key: "address.location",
          maxDistance: radius, 
        },
      },
      {
        $match: {
          businessType: { $in: businessTypesArray },
        },
      },
      {
        $project: {
          _id: 1,
          contactName: 1,
          email: 1,
          businessName: 1,
          businessType: 1,
          address: 1,
          distance: 1,
          ABN_Number: 1,
          about: 1,
        },
      },
    ]);

    return res.status(200).json({
      status: 200,
      message: "Providers retrieved successfully.",
      data: providers,
    });
  } catch (error) {
    return res.status(500).json({ status: 500, error: error.message });
  }
};

exports.getAllProviders = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search?.trim() || "";

    const filter = {};
    if (search) {
      filter.businessType = { $regex: search, $options: "i" };
    }

    const total = await providerModel.countDocuments(filter);

    const providers = await providerModel
      .find(filter)
      .select("-password -__v")
      .skip((page - 1) * limit)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      status: 200,
      message: "Providers fetched successfully",
      page,
      limit,
      total,
      totalPages,
      data: providers,
    });
  } catch (error) {
    console.error("Error in getAllProviders:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error",
      error: error.message,
    });
  }
};
