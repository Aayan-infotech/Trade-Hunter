require('dotenv').config(); // Load environment variables

const File = require("../models/hunterModel");
const multer = require("multer");
const path = require("path");
const User = require("../models/hunterModel");
const providerModel = require("../models/providerModel");
const jobpostModel = require("../models/jobpostModel");

// ------------------------------
// S3 Upload API Setup
// ------------------------------
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');

// Configure AWS using .env variables
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID, 
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, 
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

// Set up multer-s3 storage engine
const s3Storage = multerS3({
  s3: s3,
  bucket: process.env.AWS_S3_BUCKET_NAME, // your bucket name from .env
  acl: 'public-read', // Adjust ACL if needed
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    // Generate a unique file name using fieldname and timestamp
    cb(null, file.fieldname + '-' + Date.now() + ext);
  },
});

// Configure multer to accept up to 10 files (5MB each) using S3 storage
const s3Upload = multer({
  storage: s3Storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB per file
  fileFilter: function (req, file, cb) {
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

// ------------------------------
// API Endpoints
// ------------------------------

// New API endpoint: Upload files to S3
exports.uploadFile = (req, res) => {
  s3Upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    const { description } = req.body;
    const { providerId } = req.params;

    // Check if provider exists and has role 'provider'
    const provider = await User.findById(providerId).exec();
    if (!provider) {
      return res.status(404).json({ message: "Provider not found." });
    }
    if (provider.userType !== "provider") {
      return res.status(403).json({ message: "Unauthorized: Not a provider." });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Please upload at least one file." });
    }

    try {
      // Prepare file metadata from S3 upload
      const filesData = req.files.map(file => ({
        filename: file.key,       // S3 object key (unique filename)
        url: file.location,       // S3 file URL
        size: file.size,
        description: description || " ",
      }));

      // Merge with existing files if any
      const existingFiles = provider.files || [];
      const updatedFiles = [...existingFiles, ...filesData];

      const updatedProvider = await User.findByIdAndUpdate(
        providerId,
        { files: updatedFiles },
        { new: true, runValidators: true }
      );

      res.status(200).json({
        message: "Files uploaded successfully!",
        provider: updatedProvider,
      });
    } catch (error) {
      res.status(500).json({ message: "Error saving file to the database.", error });
    }
  });
};

// The rest of your APIs remain unchanged

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

    aggregation.push({
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        distanceField: "distance",
        maxDistance: radius * 1000,
        spherical: true,
      },
    });

    aggregation.push({
      $match: { jobStatus: "Pending" },
    });

    if (businessType) {
      aggregation.push({
        $match: { businessType },
      });
    }

    aggregation.push({
      $match: {
        $expr: {
          $lte: [
            "$distance",
            { $multiply: ["$jobLocation.jobRadius", 1000] },
          ],
        },
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
          key: "location.location", // Ensure this field is indexed correctly
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
          businessType: { $regex: new RegExp(`^${businessType}$`, "i") },
          jobStatus: "Pending",
          ...(services ? { services } : {}),
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
