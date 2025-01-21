const Location = require("../models/locationModel");

const getNearbyLocations = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5000 } = req.body; // radius default is 5000 meters

    // Validate inputs
    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Latitude and longitude are required." });
    }

    // Convert radius to meters for MongoDB query
    const locations = await Location.find({
      location: {
        $geoWithin: {
          $centerSphere: [[longitude, latitude], radius / 6371000], // radius in radians
        },
      },
    });

    res.json({
      message: "Nearby locations fetched successfully",
      data: locations,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { getNearbyLocations };