const DeviceToken = require('../models/devicetokenModel');

const createDeviceToken = async (req, res) => {
    try {
        const { userId, token } = req.body;

        if (!userId || !token) {
            return res.status(400).json({ message: "User ID and Token are required." });
        }

        const updatedToken = await DeviceToken.findOneAndUpdate(
            { userId },
            { token },
            { new: true, upsert: true }
        );

        return res.status(201).json({ message: "Device Token created/updated successfully.", data: updatedToken });
    } catch (error) {
        console.error("Error creating/updating device token:", error);
        return res.status(500).json({ message: "Internal Server Error." });
    }
};

const getAllDeviceTokens = async (req, res) => {
    try {
        const deviceTokens = await DeviceToken.find();
        return res.status(200).json({ message: "All Device Tokens", data: deviceTokens });
    } catch (error) {
        console.error("Error in getAllDeviceTokens:", error);
        return res.status(500).json({ message: "Internal Server Error." });
    }
};

const getTokenByUserId = async (req, res) => {
    const { userId } = req.params;
    try {
        const deviceToken = await DeviceToken.findOne({ userId });
        if (!deviceToken) {
            return res.status(404).json({ message: "Device token not found for this user." });
        }
        return res.status(200).json({ message: "Device token fetched successfully.", data: deviceToken });
    } catch (error) {
        console.error("Error fetching device token:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

module.exports = {
    createDeviceToken,
    getAllDeviceTokens,
    getTokenByUserId
};