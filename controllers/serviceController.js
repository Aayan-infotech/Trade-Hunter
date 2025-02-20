const { ServiceCatalogAppRegistry } = require("aws-sdk");
const Service = require("../models/serviceModel");

const createService = async (req, res) => {
  try {
    const { name } = req.body;

    // Validate input
    if (  !Array.isArray(name)) {
      return res.status(400).json({
        success: false,
        message: "name array are required.",
      });
    }

    // Insert the new service group
    const newName = await Service.create({ name });

    res.status(201).json({
      success: true,
      message: "Service group created successfully.",
      data: newName,
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
    const Name = await Service.find({});

    res.status(201).json({
      success: true,
      message: "names fetched successfully.",
      data: Name,
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
    const { name } = req.body;

    if (!Array.isArray(name)) {
      return res.status(400).json({
        success: false,
        message: "Name array are required.",
      });
    }

    const Names = await Service.findById(id)
      ;
    if (!name) {
      return res.status(404).json({
        success: false,
        message: "Service names not found.",
      });
    }

    const updatedName = await name.findByIdAndUpdate(
      id,
      { name},
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Service updated successfully.",
      data: updatedName,
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

    const name = await Service.findById(id);
    if (!name) {
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
