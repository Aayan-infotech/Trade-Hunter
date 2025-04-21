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
    const {
      addressType,
      address,        // the address line in Address schema
      latitude,
      longitude,
      radius,
      ...otherFields // any other hunter fields (e.g. name, phone, etc.)
    } = req.body;

    // 1. Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Invalid ID format",
        data: [],
      });
    }

    // 2. Ensure hunter exists
    const hunterExists = await Hunter.findById(id);
    if (!hunterExists) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Hunter not found",
        data: [],
      });
    }

    // 3. Prepare Hunter update (flatten nested address fields as before)
    const hunterUpdate = { ...otherFields };
    if (address !== undefined) {
      hunterUpdate["address.addressLine"] = address;
    }
    if (latitude !== undefined && longitude !== undefined) {
      hunterUpdate["address.location.coordinates"] = [
        Number(longitude),
        Number(latitude),
      ];
      hunterUpdate["address.location.type"] = "Point";
    }
    if (radius !== undefined) {
      hunterUpdate["address.radius"] = Number(radius);
    }
    if (req.fileLocations?.length) {
      hunterUpdate.images = req.fileLocations[0];
    }

    // 4. Prepare Address update
    const addressUpdate = {};
    if (addressType !== undefined) {
      addressUpdate.addressType = addressType;
    }
    if (address !== undefined) {
      addressUpdate.address = address;
    }
    if (latitude !== undefined && longitude !== undefined) {
      addressUpdate.location = {
        type: "Point",
        coordinates: [ Number(longitude), Number(latitude) ],
      };
    }
    if (radius !== undefined) {
      addressUpdate.radius = Number(radius);
    }

    // 5. Execute both updates (you can wrap in a transaction if desired)
    const updatedHunter = await Hunter.findByIdAndUpdate(
      id,
      { $set: hunterUpdate },
      { new: true, runValidators: true }
    );
    if (!updatedHunter) {
      return res.status(500).json({
        status: 500,
        success: false,
        message: "Failed to update Hunter",
        data: [],
      });
    }

    // Only update Address if we have something to set
    let updatedAddress = null;
    if (Object.keys(addressUpdate).length > 0) {
      updatedAddress = await Address.findOneAndUpdate(
        { userId: id },
        { $set: addressUpdate },
        { new: true, runValidators: true }
      );
      if (!updatedAddress) {
        return res.status(404).json({
          status: 404,
          success: false,
          message: "Address record not found for this user",
          data: [],
        });
      }
    }

    // 6. Send back success
    return res.status(200).json({
      status: 200,
      success: true,
      message: "Hunter and Address updated successfully",
      data: {
        hunter: updatedHunter,
        address: updatedAddress || "(unchanged)",
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Server Error",
      error: error.message,
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
