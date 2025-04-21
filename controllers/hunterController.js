const mongoose = require("mongoose");
const providerModel = require("../models/providerModel");
const Hunter = require("../models/hunterModel");
const Address = require("../models/addressModel");

// Helper to run multiple operations in a transaction
async function withTransaction(fn) {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    session.endSession();
  }
}

// Fetch nearby service providers with pagination and optional search
exports.getNearbyServiceProviders = async (req, res) => {
  try {
    const { latitude, longitude, radius, page = 1, limit = 10 } = req.body;
    const { search = "" } = req.query;
    const offset = (page - 1) * limit;

    if (latitude == null || longitude == null || radius == null) {
      return res.status(400).json({
        message: "Latitude, Longitude and radius are required.",
        status: 400,
      });
    }

    const aggregation = [];
    aggregation.push({
      $geoNear: {
        near: { type: "Point", coordinates: [longitude, latitude] },
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
        totalCount: [{ $count: "total" }],
      },
    });
    aggregation.push({
      $project: {
        data: "$totalData",
        total: { $arrayElemAt: ["$totalCount.total", 0] },
      },
    });

    const result = await providerModel.aggregate(aggregation);
    if (!result.length || !result[0].data.length) {
      return res.status(404).json({
        message: "No service providers found within the given radius.",
        status: 404,
      });
    }

    const { data, total = 0 } = result[0];
    const totalPage = Math.ceil(total / limit);
    const currentPage = page;

    return res.status(200).json({
      status: 200,
      message: "Nearby service providers fetched successfully.",
      data,
      pagination: { totalPage, currentPage, limit, totalRecords: total },
    });
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while fetching nearby service providers.",
      error: error.message,
      status: 500,
    });
  }
};

// Update a hunter and its Address record
exports.updateHunterById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 400, success: false, message: "Invalid ID format", data: [] });
    }

    // Prepare updates for Hunter
    const hunterUpdate = { ...req.body };
    if (hunterUpdate.addressLine !== undefined) {
      hunterUpdate["address.addressLine"] = hunterUpdate.addressLine;
      delete hunterUpdate.addressLine;
    }
    if (hunterUpdate.latitude !== undefined && hunterUpdate.longitude !== undefined) {
      hunterUpdate["address.location.coordinates"] = [
        Number(hunterUpdate.longitude),
        Number(hunterUpdate.latitude),
      ];
      hunterUpdate["address.location.type"] = 'Point';
      delete hunterUpdate.latitude;
      delete hunterUpdate.longitude;
    }
    if (hunterUpdate.radius !== undefined) {
      hunterUpdate["address.radius"] = Number(hunterUpdate.radius);
      delete hunterUpdate.radius;
    }
    if (req.fileLocations && req.fileLocations.length) {
      hunterUpdate.images = req.fileLocations[0];
    }

    // Mirror updates for Address
    const addressUpdate = {};
    if (hunterUpdate["address.addressLine"]) {
      addressUpdate.addressLine = hunterUpdate["address.addressLine"];
    }
    if (hunterUpdate["address.location.coordinates"]) {
      addressUpdate.location = {
        type: 'Point',
        coordinates: hunterUpdate["address.location.coordinates"],
      };
    }
    if (hunterUpdate["address.radius"] !== undefined) {
      addressUpdate.radius = hunterUpdate["address.radius"];
    }

    // Run both updates in a transaction
    const { updatedHunter } = await withTransaction(async (session) => {
      const updatedHunter = await Hunter.findByIdAndUpdate(id, hunterUpdate, {
        new: true,
        runValidators: true,
        session,
      });
      if (!updatedHunter) throw new Error('Hunter not found');

      if (Object.keys(addressUpdate).length) {
        const updatedAddress = await Address.findOneAndUpdate(
          { userId: id },
          { $set: addressUpdate },
          { new: true, runValidators: true, session }
        );
        if (!updatedAddress) throw new Error('Address record not found');
      }

      return { updatedHunter };
    });

    return res.status(200).json({ status: 200, success: true, message: 'Hunter and Address updated successfully', data: [updatedHunter] });
  } catch (error) {
    return res.status(500).json({ status: 500, success: false, message: 'Server Error', error: error.message, data: [] });
  }
};

// Update only the radius for authenticated hunter
exports.updateRadius = async (req, res) => {
  try {
    const id = req.user.userId;
    const { radius } = req.body;

    if (typeof radius !== 'number' || radius < 0) {
      return res.status(400).json({ status: 400, success: false, message: 'Invalid radius value. It must be a positive number.' });
    }

    await withTransaction(async (session) => {
      const updatedHunter = await Hunter.findByIdAndUpdate(
        id,
        { $set: { 'address.radius': radius } },
        { new: true, session }
      );
      if (!updatedHunter) throw new Error('Hunter not found');

      const updatedAddress = await Address.findOneAndUpdate(
        { userId: id },
        { $set: { radius } },
        { new: true, runValidators: true, session }
      );
      if (!updatedAddress) throw new Error('Address record not found');

      return { radius: updatedHunter.address.radius };
    });

    return res.status(200).json({ status: 200, success: true, message: 'Radius updated successfully.', data: { radius } });
  } catch (error) {
    return res.status(500).json({ status: 500, success: false, message: 'Internal server error.', error: error.message });
  }
};
