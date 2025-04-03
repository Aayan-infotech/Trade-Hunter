const mongoose = require("mongoose");

const ProviderPhotoSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    files: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, required: true },
        url: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProviderPhoto", ProviderPhotoSchema);
