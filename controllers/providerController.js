const File = require("../models/hunterModel");
const multer = require("multer");
const path = require("path");
const User = require("../models/hunterModel");
const providerModel = require("../models/providerModel");
const jobpostModel = require("../models/jobpostModel");

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

// Configure multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit
  fileFilter: function (req, file, cb) {
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

// Handle file upload and save to database
exports.uploadFile = (req, res) => {
  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    const { description } = req.body;
    const { providerId } = req.params;

    //added
    // Check if providerId exists and belongs to a user with the role 'provider'
    const provider = await User.findById(providerId).exec();
    if (!provider) {
      return res.status(404).json({ message: "Provider not found." });
    }

    if (provider.userType !== "provider") {
      return res.status(403).json({ message: "Unauthorized: Not a provider." });
    }

    // Handling multiple file uploads
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ message: "Please upload at least one file." });
    }
    // .......................

    try {
      // Assuming multiple files are allowed and we want to save them all
      const filesData = req.files.map((file) => ({
        filename: file.filename,
        path: file.path,
        size: file.size,
        description: description || " ",
      }));

      // Check if there are existing files associated with this provider
      const existingFiles = provider.files || [];

      // Combine the existing files with the new ones
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
      res
        .status(500)
        .json({ message: "Error saving file to the database.", error });
    }
  });
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
