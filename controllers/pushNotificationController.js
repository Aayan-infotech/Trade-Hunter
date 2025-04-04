const admin = require('../config/firebaseConfig');
const Notification = require("../models/pushNotificationModel");
const massNotification = require('../models/massNotification');
const DeviceToken = require("../models/devicetokenModel");


exports.sendPushNotification = async (req, res) => {
  try {
    const { title, body, receiverId, notificationType } = req.body;
    const userId = req.user.userId;

    if (!title || !body || !receiverId || !notificationType) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Title and body are required.",
        data: []
      });
    }
    // Validate notificationType
    const validTypes = ['job_alert', 'voucher_update', 'job_accept', 'job_complete'];
    if (!validTypes.includes(notificationType)) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Invalid notificationType. Allowed types: " + validTypes.join(", "),
        data: []
      });
    }

    const device = await DeviceToken.findOne({ userId });
    if (!device) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Device token not found for the user.",
        data: []
      });
    }

    const message = {
      notification: { title, body },
      token: device.deviceToken,
    };

    await admin.messaging().send(message);
    const notificationData = await Notification.create({ userId, title, body, receiverId, notificationType });

    res.status(200).json({
      status: 200,
      success: true,
      message: "Notification sent successfully.",
      data: [notificationData]
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({
      status: 500,
      success: false,
      message: "Failed to send notification.",
      data: [],
      error: error.message
    });
  }
};

exports.getNotificationsByUserId = async (req, res) => {
  try {
    const receiverId = req.user.userId;
    const userType = req.params.userType;

    const userNotifications = await Notification.find({ receiverId });
    const massNotifications = await massNotification.find({ userType });
    const allNotifications = [...userNotifications, ...massNotifications];
    allNotifications.sort((a, b) => b.createdAt - a.createdAt);
    res.status(200).json({ 
      status:200,
      success: true,
      data: allNotifications,
      message:"get all notification!"
     });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: error.message,
      success: false
    })
  }
};

exports.ReadNotification = async (req, res) => {
  const receiverId = req.user.userId;
  const notificationId = req.params.notificationId;

  if (!receiverId || !notificationId) {
    return res.status(400).json({
      status: 400,
      success: false,
      message: "Receiver ID and notification ID are required.",
      data: [],
    });
  }

  try {
    const notification = await Notification.findOne({ _id: notificationId, receiverId });

    if (!notification) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Notification not found.",
        data: [],
      });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Notification marked as read.",
      data: [notification],
    });
  } catch (error) {
    console.error("Error fetching notification:", error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Internal Server Error.",
      data: [],
      error: error.message,
    });
  }
};

exports.AllReadNotifications = async (req, res) => {
  const receiverId = req.user.userId;

  if (!receiverId) {
    return res.status(400).json({
      status: 400,
      success: false,
      message: "Receiver ID is required.",
      data: [],
    });
  }

  try {
    // Fetch all notifications with isRead set to true for the given receiverId
    const notifications = await Notification.find({ receiverId, isRead: true });

    if (notifications.length === 0) {
      return res.status(200).json({
        status: 200,
        success: false,
        message: "No read notifications found.",
        data: [],
      });
    }

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Fetched read notifications successfully.",
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Internal Server Error.",
      data: [],
      error: error.message,
    });
  }
};

exports.sendPushNotification2 = async (req, res) => {
  try {
    const { title, body, receiverId, notificationType } = req.body;
    const userId = req.user.userId;

    const newNotification = new Notification({
      userId,
      receiverId,
      title,
      body,
      notificationType,
      createdAt: new Date()
    });

    await newNotification.save();

    return res.status(201).json({
      status: 201,
      success: true,
      message: "Notification sent successfully",
      data: newNotification
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.sendAdminNotification = async (req, res) => {
  try {
    const { title, body } = req.body;
    const { receiverId } = req.params;

    const notificationType = 'admin_message';

    if (!title || !body || !receiverId) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Title, body, and receiverId are required.",
        data: []
      });
    }
    const notificationData = await Notification.create({ title, body, receiverId, notificationType });

    // Find device token (optional)
    const device = await DeviceToken.findOne({ userId: receiverId });

    // If device token is not found, just return success without sending notification
    if (!device) {
      return res.status(200).json({
        status: 200,
        success: true,
        message: "Notification saved but not sent (device token not found).",
        data: [notificationData]
      });
    }

    // Send notification if device token exists
    const message = {
      notification: { title, body },
      token: device.deviceToken,
    };

    await admin.messaging().send(message);

    res.status(200).json({
      status: 200,
      success: true,
      message: "Notification sent successfully.",
      data: [notificationData]
    });

  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({
      status: 500,
      success: false,
      message: "Failed to send notification.",
      data: [],
      error: error.message
    });
  }
};

exports.getAdminNotification = async (req, res) => {
  try {
    const { receiverId } = req.params;

    if (!receiverId) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Receiver ID is required.",
        data: [],
      });
    }

    const notifications = await Notification.find({
      receiverId,
      notificationType: 'admin_message'
    }).sort({ createdAt: -1 });

    if (!notifications || notifications.length === 0) {
      return res.status(200).json({
        status: 200,
        success: true,
        message: "No admin notifications found for this user.",
        data: [],
      });
    }

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Admin notifications fetched successfully.",
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching admin notifications:", error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Internal Server Error.",
      data: [],
      error: error.message,
    });
  }
};

exports.deleteNotificationById = async (req, res) => {
  try {
    const { notificationId } = req.params;

    if (!notificationId) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Notification ID is required.",
        data: [],
      });
    }

    const deletedNotification = await Notification.findByIdAndDelete(notificationId);

    if (!deletedNotification) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Notification not found.",
        data: [],
      });
    }

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Notification deleted successfully.",
      data: [deletedNotification],
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Internal Server Error.",
      data: [],
      error: error.message,
    });
  }
};



