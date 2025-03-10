const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const providerModel = require("../models/providerModel");
const jobpostModel = require("../models/jobpostModel");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("Destination callback called. File received:", file);
    cb(null, "uploads/"); 
  },
  filename: function (req, file, cb) {
    console.log("Filename callback called. File received:", file);
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
    console.log("File filter invoked. File received:", file);
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
  console.log("Request params:", req.params);
  console.log("Request body:", req.body);
  console.log("Request files:", req.files);

  const { description } = req.body;
  const { providerId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(providerId)) {
    return res.status(400).json({ status: 400, message: "Invalid provider id." });
  }

  try {
    const provider = await providerModel.findById(providerId).exec();
    console.log("Provider fetched:", provider);
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

exports.getJobs = async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      radius = 5000,
      businessType,
      offset = 0,
      limit = 10,
    } = req.body;

    let aggregation = [];

    // Use $geoNear as the first stage for geospatial filtering
    aggregation.push({
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        distanceField: "distance",
        maxDistance: radius * 1000, // Convert km to meters
        spherical: true,
      },
    });

    // Filter by job status 'Pending'
    aggregation.push({
      $match: { jobStatus: "Pending" },
    });

    // Filter by business type if provided
    if (businessType) {
      aggregation.push({
        $match: { businessType },
      });
    }

    // Ensure the provider is within the job's visibility radius
    aggregation.push({
      $match: {
        $expr: {
          $lte: [
            "$distance",
            { $multiply: ["$jobLocation.jobRadius", 1000] }, // Convert job's radius from km to meters
          ],
        },
      },
    });

    // Pagination and total count
    aggregation.push({
      $facet: {
        totalData: [{ $skip: offset }, { $limit: limit }],
        total: [{ $count: "total" }],
      },
    });

    // Reshape response
    aggregation.push({
      $project: {
        data: "$totalData",
        total: { $arrayElemAt: ["$total.total", 0] },
      },
    });

    const result = await jobpostModel.aggregate(aggregation);

    const data = result[0]?.data || [];
    const total = result[0]?.total || 0;
    const totalPage = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    res.status(200).json({
      status: 200,
      totalPage,
      currentPage,
      limit,
      offset,
      data,
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

// for guest job post
exports.getServicesForGuestLocation2 = async (req, res) => {
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

    const result = await jobpostModel.aggregate(aggregation);
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

exports.getJobsForGuest = async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      radius = 5000,
      offset = 0,
      limit = 10,
    } = req.body; // Default radius: 5km

    if (!latitude || !longitude) {
      return res.status(400).json({
        message: "Latitude and Longitude are required.",
        status: 400,
      });
    }

    const aggregation = [
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude], // Longitude first
          },
          distanceField: "distance",
          maxDistance: radius * 1000, // Convert km to meters
          spherical: true,
          key: "location.location", // Make sure this field is indexed correctly
        },
      },
      {
        $facet: {
          totalData: [{ $skip: offset }, { $limit: limit }],
          total: [{ $count: "total" }],
        },
      },
      {
        $project: {
          data: "$totalData",
          total: { $arrayElemAt: ["$total.total", 0] },
        },
      },
    ];

    // Execute the aggregation query
    const result = await jobpostModel.aggregate(aggregation);

    const data = result[0]?.data || [];
    const total = result[0]?.total || 0;
    const totalPage = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    res.status(200).json({
      status: 200,
      totalPage,
      currentPage,
      limit,
      offset,
      data,
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
      services,
      latitude,
      longitude,
      radius,
      page = 1,
      limit = 10,
    } = req.body;

    if (!businessType || !latitude || !longitude || !radius) {
      return res
        .status(400)
        .json({ status: 400, message: "Missing required fields" });
    }

    const jobs = await jobpostModel.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] },
          distanceField: "distance",
          maxDistance: radius * 1000, // Convert km to meters
          spherical: true,
          key: "jobLocation.location",
        },
      },
      {
        $match: {
          businessType: { $regex: new RegExp(`^${businessType}$`, "i") }, // Case-insensitive match
          jobStatus: "Pending",
          ...(services ? { services } : {}), // Match services if provided
        },
      },
      {
        $sort: { distance: 1 }, // Sort by closest jobs first
      },
      {
        $skip: (page - 1) * limit, // Skip previous pages
      },
      {
        $limit: limit, // Limit results per page
      },
    ]);

    // Get total job count for pagination metadata
    const totalJobs = await jobpostModel.countDocuments({
      businessType: { $regex: new RegExp(`^${businessType}$`, "i") },
      jobStatus: "Pending",
    });

    return res.status(200).json({
      status: 200,
      message: "Job fetch completed successfully",
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
      .json({ status: 500, message: "Error fetching nearby jobs:" + error });
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
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const updatedProvider = await providerModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedProvider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    res.status(200).json({ message: "Provider updated successfully", updatedProvider });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.getProviderProfile = async (req, res) => {
  try {
    const { providerId } = req.params;
    // Populate assignedJobs and then populate the 'user' field inside each job
    const provider = await providerModel.findById(providerId)
      .populate({
        path: "assignedJobs",
        populate: {
          path: "user",
          select: "name email" 
        }
      });

    if (!provider) {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }

    res.status(200).json({ success: true, message: "Provider fetched successfully", data: provider });
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
      jobAcceptCount : updatedProvider.jobAcceptCount,
    });
  } catch (error) {
    console.error("Error in incrementJobAcceptCount:", error);
    return res.status(500).json({ 
      status: 500, 
      message: "Internal server error", 
      error: error.message 
    });
  }
};

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
      jobCompleteCount : updatedProvider.jobCompleteCount,
    });
  } catch (error) {
    console.error("Error in incrementJobCompleteCount:", error);
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
    const { lat, lng, radius, businessType } = req.query;
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
          businessType: { $in: [businessType] },
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
