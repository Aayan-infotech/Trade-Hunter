const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const providerUploadedPictures = new Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Provider",
            required: true,
        },
        files: [{
            type: String,
        }],
    },
    { timestamps: true }
);

module.exports = mongoose.model('providerPhotos', providerUploadedPictures);
