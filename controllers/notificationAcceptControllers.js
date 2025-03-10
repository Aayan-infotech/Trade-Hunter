const Notification = require('../models/notificationAcceptModel');


// Create a new notification
exports.createNotification = async (req, res) => {
    try {
        const { providerId, hunterID, jobId, text } = req.body;
        const notification = new Notification({ providerId, hunterID, jobId, text });
        await notification.save();
        res.status(201).json({
            status: 201,
            message: 'Notification created successfully',
            success: true,
            data: notification
        });
    } catch (error) {
        res.status(500).json({
            status: 500,
            message: 'Error creating notification',
            success: false,
            error: error.message
        });
    }
};

// Get all notifications
exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ createdAt: -1 });
        res.status(200).json({
            status: 200,
            message: 'Notifications fetched successfully',
            success: true,
            data: notifications
        });
    } catch (error) {
        res.status(500).json({
            status: 500,
            message: 'Error fetching notifications',
            success: false,
            error: error.message
        });
    }
};

// Get a single notification by ID
exports.getNotificationById = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) return res.status(404).json({
            status: false,
            message: 'Notification not found',
            success: false
        });
        res.status(200).json({
            status: 200,
            message: 'Notification fetched successfully',
            success: true,
            data: notification
        });
    } catch (error) {
        res.status(500).json({
            status: 500,
            message: 'Error fetching notification',
            success: false,
            error: error.message
        });
    }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findByIdAndDelete(req.params.id);
        if (!notification) return res.status(404).json({
            status: false,
            message: 'Notification not found',
            success: false
        });
        res.status(200).json({
            status: 200,
            message: 'Notification deleted successfully',
            success: true
        });
    } catch (error) {
        res.status(500).json({
            status: 500,
            message: 'Error deleting notification',
            success: false,
            error: error.message
        });
    }
};

