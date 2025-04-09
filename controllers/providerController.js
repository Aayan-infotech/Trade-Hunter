const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const providerModel = require("../models/providerModel");
const jobpostModel = require("../models/jobpostModel");
const providerPhotosModel = require("../models/providerPhotos");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // console.log("Destination callback called. File received:", file);
    cb(null, "uploads/"); 
  },
  filename: function (req, file, cb) {
    // console.log("Filename callback called. File received:", file);
    if (!file || !file.originalname) {
      return cb(new Error("No file provided or file is undefined."));
    }
    cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 },
  fileFilter: function (req, file, cb) {
    // console.log("File filter invoked. File received:", file);
    if (!file) {
      return cb(new Error("No file provided."));
    }
    const filetypes = /jpeg|jpg|png|gif|webp|jfif|pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Error: Only images or PDF files are allowed!"));
    }
  },
}).array("file", 10);

exports.uploadFile = async (req, res) => {
  // console.log("Request params:", req.params);
  // console.log("Request body:", req.body);
  // console.log("Request files:", req.files);

  const { description } = req.body;
  const { providerId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(providerId)) {
    return res.status(400).json({ status: 400, message: "Invalid provider id." });
  }

  try {
    const provider = await providerModel.findById(providerId).exec();
    // console.log("Provider fetched:", provider);
    if (!provider) {
      return res.status(404).json({ status: 404, message: "Provider not found." });
    }
    if (!provider.userType || provider.userType.toLowerCase() !== "provider") {
      return res.status(403).json({ status: 403, message: "Unauthorized: Not a provider." });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ status: 400, message: "Please upload at least one file." });
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
    return res.status(500).json({ status: 500, message: "Error saving file to the database.", error });
  }
};

// plz check
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

// for guest user
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

exports.getNearbyJobs  = async (req, res) => {
  try {
    const {
      businessType,
      latitude,
      longitude,
      radius,  
      page = 1,
      limit = 10,
    } = req.body;

    if (!businessType ||  !latitude || !longitude || !radius) {
      return res.status(400).json({ status: 400, message: "Missing required fields" });
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

    const radiusInRadians = radius / 6378100;
    const totalJobs = await jobpostModel.countDocuments({
      businessType: businessTypeCondition,
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
          jobStatus: "Pending", // Fetch only pending jobs
        },
      },
      {
        $sort: { distance: 1 }, // Sort by nearest first
      },
      {
        $skip: (page - 1) * limit, // Pagination: Skip previous pages
      },
      {
        $limit: limit, // Limit results per page
      },
    ]);

    // Get total job count for pagination metadata
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
      return res.status(400).json({ status: 400, message: "Job ID is required" });
    }

    const job = await jobpostModel.findById(jobId);

    if (!job) {
      return res.status(404).json({ status: 404, message: "Job not found" });
    }

    return res.status(200).json({ status: 200, message: "Job fetched successfully", data: job });
  } catch (error) {
    console.error("Error fetching job by ID:", error);
    return res.status(500).json({ status: 500, message: "Error fetching job: " + error });
  }
};

exports.updateProviderById = async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = { ...req.body };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    if (updateData.addressLine !== undefined) {
      updateData["address.addressLine"] = updateData.addressLine;
      delete updateData.addressLine;
    }
    if (updateData.latitude !== undefined && updateData.longitude !== undefined) {
      updateData["address.location.coordinates"] = [
        Number(updateData.longitude), 
        Number(updateData.latitude)
      ];
      updateData["address.location.type"] = 'Point';
      delete updateData.latitude;
      delete updateData.longitude;
    }
    if (updateData.radius !== undefined) {
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

    // Fetch provider details and populate assignedJobs with user details
    const provider = await providerModel.findById(providerId)
      .populate({
        path: "assignedJobs",
        populate: {
          path: "user",
          select: "name email"
        }
      });

    // Fetch work gallery with correct query
    const workgallery = await providerPhotosModel.findOne({ userId: providerId }).select("files");

    if (!provider) {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }

    res.status(200).json({ 
      success: true, 
      message: "Provider fetched successfully", 
      data: provider,
      workgallery
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
        message: "Invalid provider id." 
      });
    }

    const updatedProvider = await providerModel.findByIdAndUpdate(
      providerId,
      { $inc: { jobAcceptCount: 1 } },
      { new: true, runValidators: true }
    );

    if (!updatedProvider) {
      return res.status(404).json({ 
        status: 404, 
        message: "Provider not found." 
      });
    }

    return res.status(200).json({
      status: 200,
      message: "Job accept count incremented successfully!",
      jobAcceptCount: updatedProvider.jobAcceptCount,
    });
  } catch (error) {
    console.error("Error in jobAcceptCount:", error);
    return res.status(500).json({ 
      status: 500, 
      message: "Internal server error", 
      error: error.message 
    });
  }
};

// Increment job complete count for a provider
exports.jobCompleteCount = async (req, res) => {
  try {
    const { providerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({ 
        status: 400, 
        message: "Invalid provider id." 
      });
    }

    const updatedProvider = await providerModel.findByIdAndUpdate(
      providerId,
      { $inc: { jobCompleteCount: 1 } },
      { new: true, runValidators: true }
    );

    if (!updatedProvider) {
      return res.status(404).json({ 
        status: 404, 
        message: "Provider not found." 
      });
    }

    return res.status(200).json({
      status: 200,
      message: "Job complete count incremented successfully!",
      jobCompleteCount: updatedProvider.jobCompleteCount,
    });
  } catch (error) {
    console.error("Error in jobCompleteCount:", error);
    return res.status(500).json({ 
      status: 500, 
      message: "Internal server error", 
      error: error.message 
    });
  }
};

exports.completionRate = async (req, res) => {
  try {
    const { providerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({ 
        status: 400, 
        message: "Invalid provider id." 
      });
    }

    const provider = await providerModel.findById(providerId);
    if (!provider) {
      return res.status(404).json({ 
        status: 404, 
        message: "Provider not found." 
      });
    }

    const { jobAcceptCount, jobCompleteCount } = provider;
    // Prevent division by zero; if no accepted jobs, completion rate is 0%
    const completionRate = jobAcceptCount > 0 
      ? (jobCompleteCount / jobAcceptCount) * 100 
      : 0;

    return res.status(200).json({
      status: 200,
      message: "Completion rate computed successfully!",
      completionRate: completionRate
    });
  } catch (error) {
    console.error("Error computing completion rate:", error);
    return res.status(500).json({ 
      status: 500, 
      message: "Internal server error", 
      error: error.message 
    });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!fileId) {
      return res.status(400).json({ message: "File ID is required." });
    }
    
    // Get the authenticated provider's ID from the request (set by your auth middleware)
    const providerId = req.user.userId;
    
    // Find the provider using the Provider model. Rename the variable to avoid conflict.
    const foundProvider = await providerModel.findById(providerId);
    if (!foundProvider) {
      return res.status(404).json({ message: "Provider not found." });
    }
    
    // Check if there are any files in the provider's files array
    if (!foundProvider.files || foundProvider.files.length === 0) {
      return res.status(404).json({ message: "No files found for this provider." });
    }
    
    const initialCount = foundProvider.files.length;
    
    // Filter out the file with the matching fileId
    foundProvider.files = foundProvider.files.filter(
      (file) => file._id.toString() !== fileId
    );
    
    if (foundProvider.files.length === initialCount) {
      return res.status(404).json({ message: "File not found." });
    }
    
    await foundProvider.save();
    return res.status(200).json({ status:200,message: "File deleted successfully." });
  } catch (error) {
    return res.status(500).json({ status:500, message: "Internal server error", error: error.message });
  }
};

exports.getProvidersByBusinessType = async (req, res) => {
  try {
    const { lat, lng, radius, businessType } = req.body;
    if (!lat || !lng || !radius || !businessType) {
      return res.status(400).json({
        status: 400,
        message:
          "Latitude, longitude, radius, and businessType are required.",
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
          maxDistance: maxDistance,
          spherical: true,
          key: "address.location",
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


// Create or Update "about" field
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

// Get "about" field
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
