const mongoose = require("mongoose");
const providerModel = require("../models/providerModel");
const Hunter = require("../models/hunterModel");
const Address = require("../models/addressModel");

exports.getNearbyServiceProviders = async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      radius,
      page = 1,
      limit = 10
    } = req.body;

    const { search = "" } = req.query; 
    const offset = (page - 1) * limit;

    if (!latitude || !longitude || !radius) {
      return res.status(400).json({
        message: "Latitude and Longitude are required.",
        status: 400,
      });
    }

    let aggregation = [];

    aggregation.push({
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        distanceField: "distance",
        maxDistance: radius,
        spherical: true,
      },
    });

    if (search) {
      aggregation.push({
        $match: {
          "address.addressLine": { $regex: search, $options: "i" },
        },
      });
    }

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

    const result = await providerModel.aggregate(aggregation);

    if (!result || result.length === 0 || !result[0]?.data?.length) {
      return res.status(404).json({
        message: "No service providers found within the given radius.",
        status: 404,
      });
    }

    const data = result[0].data;
    const total = result[0].total || 0;
    const totalPage = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    res.status(200).json({
      status: 200,
      message: "Nearby service providers fetched successfully.",
      data,
      pagination: {
        totalPage,
        currentPage,
        limit,
        totalRecords: total,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while fetching nearby service providers.",
      error: error.message,
      status: 500,
    });
  }
};



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

    if (updateData.phoneNo !== undefined) {
      const mobileRegex = /^[0-9]+$/;
      if (!mobileRegex.test(updateData.phoneNo)) {
        return res.status(400).json({
          status: 400,
          success: false,
          message: "Mobile number should contain digits only",
          data: []
        });
      }
    }

    // 📍 Process address fields like provider update API
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

    // 🖼️ Handle image update
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

    const updatedAddress = await Address.findOneAndUpdate(
      { userId: id },
      { $set: { radius } },
      { new: true }
    );

    if (!updatedHunter) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Hunter not found."
      });
    }
  
    if (!updatedAddress) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Address not found."
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
