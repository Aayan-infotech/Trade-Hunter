const File = require("../models/userModel");
const multer = require("multer");
const path = require("path");
const User = require("../models/userModel")

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  },
});

// Configure multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp|jfif|pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Error: Only images or PDF files are allowed!"));
    }
  },
}).array("file", 10);

// Handle file upload and save to database
exports.uploadFile = (req, res) => {
  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    const { description } = req.body;
    const { providerId } = req.params;

//added
    // Check if providerId exists and belongs to a user with the role 'provider'
    const provider = await User.findById(providerId).exec();
    if (!provider) {
      return res.status(404).json({ message: "Provider not found." });
    }

    if (provider.userType !== "provider") {
      return res.status(403).json({ message: "Unauthorized: Not a provider." });
    }

    // Handling multiple file uploads
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Please upload at least one file." });
    }
    // .......................

    try {
        // Assuming multiple files are allowed and we want to save them all
        const filesData = req.files.map(file => ({
          filename: file.filename,
          path: file.path,
          size: file.size,
          description: description || " ",
        }));
  
        // Check if there are existing files associated with this provider
        const existingFiles = provider.files || [];
  
        // Combine the existing files with the new ones
        const updatedFiles = [...existingFiles, ...filesData];
  
        // Update the provider's file details
        const updatedProvider = await User.findByIdAndUpdate(
          providerId,
          { files: updatedFiles },
          { new: true, runValidators: true }
        );
  
        res.status(200).json({
          message: "Files uploaded successfully!",
          provider: updatedProvider,
        });
      } catch (error) {
      res.status(500).json({ message: "Error saving file to the database.", error });
    }
  });
};
