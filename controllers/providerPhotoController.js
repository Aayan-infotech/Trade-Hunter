const mongoose = require("mongoose");
const ProviderPhoto = require("../models/ProviderPhotos"); // Ensure the file name matches

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

    // Map each uploaded file to an object containing a unique _id and a valid URL.
    const newFileObjects = req.files.map((file) => {
      // Try to use file.location (from multerS3) or fallback to file.path.
      const url = file.location || file.path;
      if (!url) {
        throw new Error(`File ${file.originalname} did not return a valid URL.`);
      }
      return {
        _id: new mongoose.Types.ObjectId(),
        url,
      };
    });

    // Check if a ProviderPhoto document for the given userId exists.
    let providerPhoto = await ProviderPhoto.findOne({ userId });
    if (providerPhoto) {
      // Append new files to the existing files array.
      providerPhoto.files.push(...newFileObjects);
      await providerPhoto.save();
      return res.status(200).json({
        message: "Files added successfully",
        data: providerPhoto,
      });
    } else {
      // Create a new ProviderPhoto document.
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
    return res.status(500).json({ message: "Server Error", error: error.message });
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
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};



module.exports = {
  uploadProviderImages,
  getProviderPhotoByUserId
};
