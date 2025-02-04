const userModel = require("../models/userModel");
const providerModel = require("../models/providerModel");

exports.getNearbyServiceProviders = async (req, res) => {
  try {
    const RADIUS_OF_EARTH = 6371; // Radius of the Earth in kilometers
    const { latitude, longitude, radius = 5000, offset = 0, limit = 10 } = req.body; // Default radius: 5km

    if (!latitude || !longitude) {
      return res.status(400).json({
        message: "Latitude and Longitude are required.",
        status: 400,
      });
    }

    let aggregation = [];

    // Calculate the distance between the hunter's location and the service provider's location
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
                      { $sin: { $degreesToRadians: "$location.latitude" } },
                      { $sin: { $degreesToRadians: latitude } },
                    ],
                  },
                  {
                    $multiply: [
                      { $cos: { $degreesToRadians: "$location.latitude" } },
                      { $cos: { $degreesToRadians: latitude } },
                      {
                        $cos: {
                          $subtract: [
                            { $degreesToRadians: "$location.longitude" },
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

    // Match only service providers within the specified radius
    aggregation.push({
      $match: {
        distance: { $lte: radius },
      },
    });

    // Pagination for the results
    aggregation.push({
      $facet: {
        totalData: [{ $skip: offset }, { $limit: limit }],
        total: [{ $count: "total" }],
      },
    });

    // Format the response
    aggregation.push({
      $project: {
        data: "$totalData",
        total: { $arrayElemAt: ["$total.total", 0] },
      },
    });

    // Execute the aggregation query to find nearby service providers
    const result = await providerModel.aggregate(aggregation); // Corrected model usage

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
