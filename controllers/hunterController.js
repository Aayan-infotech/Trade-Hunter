const providerModel = require("../models/providerModel");

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
    console.error("Error fetching nearby service providers:", error);
    res.status(500).json({
      message: "An error occurred while fetching nearby service providers.",
      error: error.message,
      status: 500,
    });
  }
};
