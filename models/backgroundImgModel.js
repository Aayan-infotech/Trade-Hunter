const mongoose = require("mongoose");

const backgroundImgSchema = new mongoose.Schema(
  {
    backgroundImg: {
      type: String,
      required: false,
    },
    userType: {
      type: String,
      enum: ["Hunter", "Provider"],
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: function () {
        return this.userType === "hunter" ? "hunter" : "Provider";
      },
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("backgroundImg", backgroundImgSchema);
