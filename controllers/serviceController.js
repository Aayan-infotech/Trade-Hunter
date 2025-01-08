const Service = require("../models/serviceModel");

const createService = async (req, res) => {
  try {
    const { name, services } = req.body;

    // Validate input
    if (!name || !Array.isArray(services)) {
      return res.status(400).json({
        success: false,
        message: "Name and services array are required.",
      });
    }

    // Insert the new service group
    const newService = await Service.create({ name, services });

    res.status(201).json({
      success: true,
      message: "Service group created successfully.",
      data: newService,
    });
  } catch (error) {
    console.error("Error creating service group:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

const getAllServices = async (req, res) => {
  try {
    const Services = await Service.find({});

    res.status(201).json({
      success: true,
      message: "Services fetched successfully.",
      data: Services,
    });
  } catch (error) {
    console.error("Error creating service group:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

module.exports = { createService, getAllServices };
