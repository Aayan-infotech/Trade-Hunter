const Notification = require('../models/notificationModel');

exports.createNotification = async (req, res) => {
  try {
    const { userType, userId } = req.params;
    const { type, text } = req.body;
    if (!type || !text) {
      return res.status(400).json({ success: false, message: "Notification type and text are required." });
    }
    if (!['hunter', 'provider'].includes(userType)) {
      return res.status(400).json({ success: false, message: "Invalid user type." });
    }
    const notification = await Notification.create({ userId, userType, type, text });
    return res.status(201).json({ success: true, message: "Notification created successfully.", data: notification });
  } catch (error) {
    console.error("Error creating notification:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.getAllNotifications = async (req, res) => {
  try {
    const { userType, userId } = req.params;
    if (!['hunter', 'provider'].includes(userType)) {
      return res.status(400).json({ success: false, message: "Invalid user type." });
    }
    const notifications = await Notification.find({ userId, userType });
    return res.status(200).json({ success: true, message: "Notifications retrieved successfully.", data: notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.getNotificationById = async (req, res) => {
  try {
    const { userType, userId, id } = req.params;
    if (!['hunter', 'provider'].includes(userType)) {
      return res.status(400).json({ success: false, message: "Invalid user type." });
    }
    const notification = await Notification.findOne({ _id: id, userId, userType });
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    return res.status(200).json({ success: true, message: "Notification retrieved successfully.", data: notification });
  } catch (error) {
    console.error("Error fetching notification:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { userType, userId, id } = req.params;
    if (!['hunter', 'provider'].includes(userType)) {
      return res.status(400).json({ success: false, message: "Invalid user type." });
    }
    const notification = await Notification.findOneAndDelete({ _id: id, userId, userType });
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    return res.status(200).json({ success: true, message: "Notification deleted successfully." });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
