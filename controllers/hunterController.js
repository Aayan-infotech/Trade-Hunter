const mongoose = require("mongoose");
const providerModel = require("../models/providerModel");
const Hunter = require("../models/hunterModel");

exports.getNearbyServiceProviders = async (req, res) => {
  try {
    const RADIUS_OF_EARTH = 6371; // Radius of Earth in kilometers
    const { latitude, longitude, radius = 5000, page = 1, limit = 10 } = req.body;
    const offset = (page - 1) * limit;  // Calculate offset

    if (!latitude || !longitude) {
      return res.status(400).json({
        message: "Latitude and Longitude are required.",
        status: 400,
      });
    }

    // Aggregation pipeline
    let aggregation = [];

    // GeoNear to calculate distance and match service providers within the radius
    aggregation.push({
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [longitude, latitude], // GeoJSON format: [longitude, latitude]
        },
        distanceField: "distance", // This will add distance to each provider
        maxDistance: radius, // Filter providers within the radius
        spherical: true, // Use spherical geometry (great-circle distance)
      },
    });

    // Pagination logic
    aggregation.push({
      $facet: {
        totalData: [{ $skip: offset }, { $limit: limit }],
        total: [{ $count: "total" }],
      },
    });

    // Format response to include pagination data
    aggregation.push({
      $project: {
        data: "$totalData",
        total: { $arrayElemAt: ["$total.total", 0] },
      },
    });

    // Execute the aggregation query
    const result = await providerModel.aggregate(aggregation);

    if (!result || result.length === 0) {
      return res.status(404).json({
        message: "No service providers found within the given radius.",
        status: 404,
      });
    }

    const data = result[0]?.data || [];
    const total = result[0]?.total || 0;
    const totalPage = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    res.status(200).json({
      status: 200,
      message: "Nearby service providers fetched successfully.",
      totalPage,
      currentPage,
      limit,
      totalRecords: total,
      data,
    });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while fetching nearby service providers.",
      error: error.message,
      status: 500,
    });
  }
};

// plz check
exports.updateHunterById = async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = { ...req.body };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        status: 400, 
        success: false, 
        message: "Invalid ID format", 
        data: [] 
      });
    }

    const hunterExists = await Hunter.findById(id);
    if (!hunterExists) {
      return res.status(404).json({ 
        status: 404, 
        success: false, 
        message: "Hunter not found", 
        data: [] 
      });
    }

    // Process address fields similar to provider update API
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

    // Handle image update if any fileLocations are provided
    if (req.fileLocations && req.fileLocations.length > 0) {
      updateData.images = req.fileLocations[0];
    }

    const updatedHunter = await Hunter.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      status: 200,
      success: true,
      message: "Hunter updated successfully",
      data: [updatedHunter],
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      success: false,
      message: "Server Error",
      error: error.message,
      data: [],
    });
  }
};


exports.updateRadius = async (req, res) => {
  try {
    const id = req.user.userId;
    const { radius } = req.body;

    if (typeof radius !== "number" || radius < 0) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Invalid radius value. It must be a positive number."
      });
    }

    const updatedHunter = await Hunter.findByIdAndUpdate(
      id,
      { $set: { "address.radius": radius } },
      { new: true }
    );

    if (!updatedHunter) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Hunter not found."
      });
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Radius updated successfully.",
      data: { radius: updatedHunter.address.radius }
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      success: false,
      message: "Internal server error.",
      error: error.message
    });
  }
};
