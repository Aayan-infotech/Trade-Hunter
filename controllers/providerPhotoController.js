// controllers/providerPhotoController.js
const mongoose = require("mongoose");
const ProviderPhoto = require("../models/providerPhotos"); // adjust path as needed

const uploadProviderImages = async (req, res) => {
  try {
    console.log("Request body:", req.body);
    console.log("Uploaded files (req.files):", req.files);
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "Missing userId" });
    }

    // Create new file objects with a unique _id for each
    const newFileObjects = req.files.map((file) => ({
      _id: new mongoose.Types.ObjectId(),
      url: file.location,
    }));

    // Check if a ProviderPhoto document exists for this userId
    let providerPhoto = await ProviderPhoto.findOne({ userId });
    if (providerPhoto) {
      // Append new files to the existing files array
      providerPhoto.files.push(...newFileObjects);
      await providerPhoto.save();
      return res.status(200).json({
        message: "Files added successfully",
        data: providerPhoto,
      });
    } else {
      // Create a new document
      const newProviderPhoto = new ProviderPhoto({
        userId,
        files: newFileObjects,
      });
      await newProviderPhoto.save();
      return res.status(200).json({
        message: "Files uploaded and saved successfully",
        data: newProviderPhoto,
      });
    }
  } catch (error) {
    console.error("Error in uploadProviderImages controller:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const getProviderPhotoByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "Missing userId parameter" });
    }

    const providerPhoto = await ProviderPhoto.findOne({ userId });
    if (!providerPhoto) {
      return res.status(404).json({ message: "Document not found for the provided userId" });
    }
    res.status(200).json({ data: providerPhoto });
  } catch (error) {
    console.error("Error retrieving document by userId:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  uploadProviderImages,
  getProviderPhotoByUserId
};
