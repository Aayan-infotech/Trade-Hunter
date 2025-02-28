const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const providerModel = require("../models/providerModel");
const jobpostModel = require("../models/jobpostModel");

// Configure multer storage (using local disk)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("Destination callback called. File received:", file);
    cb(null, "uploads/"); // Ensure the "uploads" folder exists and is writable
  },
  filename: function (req, file, cb) {
    console.log("Filename callback called. File received:", file);
    if (!file || !file.originalname) {
      return cb(new Error("No file provided or file is undefined."));
    }
    cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  },
});

// Configure multer with a 5MB file limit and allowed file types
const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB per file
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

  // Validate providerId format
  if (!mongoose.Types.ObjectId.isValid(providerId)) {
    return res.status(400).json({ message: "Invalid provider id." });
  }

  try {
    // Look up provider in the Provider collection
    const provider = await providerModel.findById(providerId).exec();
    console.log("Provider fetched:", provider);
    if (!provider) {
      return res.status(404).json({ message: "Provider not found." });
    }
    if (!provider.userType || provider.userType.toLowerCase() !== "provider") {
      return res.status(403).json({ message: "Unauthorized: Not a provider." });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Please upload at least one file." });
    }

    // Map uploaded files to metadata
    const filesData = req.files.map((file) => ({
      // For S3 uploads, file.key holds the S3 object key and file.location the public URL
      filename: file.key,
      path: file.location,
      size: file.size,
      description: description || " ",
      uploadedAt: new Date(),
    }));

    // Combine new files with existing ones
    const existingFiles = provider.files || [];
    const updatedFiles = [...existingFiles, ...filesData];

    // Update the provider document with the new files array
    const updatedProvider = await providerModel.findByIdAndUpdate(
      providerId,
      { files: updatedFiles },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      message: "Files uploaded successfully!",
      provider: updatedProvider,
    });
  } catch (error) {
    console.error("Error in uploadFile:", error);
    return res.status(500).json({ message: "Error saving file to the database.", error });
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