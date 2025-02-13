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
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};


const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, services } = req.body;

    if (!name || !Array.isArray(services)) {
      return res.status(400).json({
        success: false,
        message: "Name and services array are required.",
      });
    }

    const service = await Service.findById(id)
      ;
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found.",
      });
    }

    const updatedService = await Service.findByIdAndUpdate(
      id,
      { name, services },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Service updated successfully.",
      data: updatedService,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found.",
      });
    }

    await Service.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Service deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

module.exports = { createService, getAllServices, updateService, deleteService };
