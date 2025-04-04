const DeviceToken = require('../models/devicetokenModel');

const createDeviceToken = async (req, res) => {
    try {
        const { deviceToken,userType } = req.body;
        const deviceType = req.headers.platform; 
        const userId = req.user.userId;

        if (!deviceToken || !deviceType || !userType) {
            return res.status(400).json({ 
                status: 400,
                success: false,
                message: "Device token and platform are required.",
                data: []
            });
        }

        if (!["android", "ios"].includes(deviceType.toLowerCase())) {
            return res.status(400).json({ 
                status: 400,
                success: false,
                message: "Invalid platform type. Use 'android' or 'ios'.",
                data: []
            });
        }

        const updatedToken = await DeviceToken.findOneAndUpdate(
            { userId },
            { deviceToken, deviceType: deviceType.toLowerCase(),userType: userType.toLowerCase() },
            { new: true, upsert: true }
        );

        return res.status(201).json({ 
            status: 201,
            success: true,
            message: "Device Token saved successfully.",
            data: [updatedToken]
        });
    } catch (error) {
        console.error("Error saving device token:", error);
        return res.status(500).json({ 
            status: 500,
            success: false,
            message: "Internal Server Error.",
            data: []
        });
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