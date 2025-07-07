const mongoose = require("mongoose");
const ProviderPhoto = require("../models/providerPhotos");

const uploadProviderImages = async (req, res) => {
  try {
    const MAX_FILES = 10;
    const MAX_FILE_SIZE = 5 * 1024 * 1024; 
    const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "Missing userId" });
    }

    if (req.files.length > MAX_FILES) {
      return res.status(400).json({ message: `You can upload a maximum of ${MAX_FILES} files.` });
    }

    for (let file of req.files) {
      if (!file.buffer && !file.location && !file.path) {
        return res.status(400).json({ message: `File ${file.originalname} is invalid.` });
      }

      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({ message: `File ${file.originalname} exceeds 5MB size limit.` });
      }

      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return res.status(400).json({ message: `File ${file.originalname} has an unsupported format.` });
      }
    }

    const newFileObjects = req.files.map((file) => {
      return {
        _id: new mongoose.Types.ObjectId(),
        url: file.location || file.path || file.buffer,
      };
    });

    let providerPhoto = await ProviderPhoto.findOne({ userId });
    if (providerPhoto) {
      providerPhoto.files.push(...newFileObjects);
      await providerPhoto.save();
      return res.status(200).json({
        message: "Files added successfully",
        data: providerPhoto,
      });
    } else {
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
    return res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const getProviderPhotoByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({status:400, success:false,  message: "Missing userId parameter" });
    }

    const providerPhoto = await ProviderPhoto.findOne({ userId });
    if (!providerPhoto) {
      return res.status(201).json({ status:201, success:true,  message: "Document not found for the provided userId" });
    }
    res.status(200).json({ data: providerPhoto });
  } catch (error) {
    console.error("Error retrieving document by userId:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const deleteFileById = async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!fileId) {
      return res.status(400).json({ message: "Missing fileId parameter" });
    }
    
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ message: "Invalid fileId parameter" });
    }
    
    const fileObjectId = new mongoose.Types.ObjectId(fileId);

    const providerPhoto = await ProviderPhoto.findOneAndUpdate(
      { "files._id": fileObjectId },
      { $pull: { files: { _id: fileObjectId } } },
      { new: true }
    );
    
    if (!providerPhoto) {
      return res.status(404).json({ message: "File not found" });
    }

    return res.status(200).json({
      message: "File deleted successfully",
      data: providerPhoto,
    });
  } catch (error) {
    console.error("Error in deleteFileById controller:", error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};



module.exports = {
  uploadProviderImages,
  getProviderPhotoByUserId,
  deleteFileById
};
