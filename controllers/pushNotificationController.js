const admin = require('../config/firebaseConfig');
const Notification = require("../models/pushNotificationModel");
const DeviceToken = require("../models/devicetokenModel");


exports.sendPushNotification = async (req, res) => {
  try {
      const { title, body,receiverId } = req.body;
      const userId = req.user.userId;

      if (!title || !body || !receiverId) {
          return res.status(400).json({ 
              status: 400, 
              success: false, 
              message: "Title and body are required.", 
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
      const notificationData = await Notification.create({ userId, title, body,receiverId});

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

// exports.sendPushNotification = async (req, res) => {
//   const { userId, token, title, body } = req.body; 

//   if (!userId || !token || !title || !body) {
//     return res.status(400).json({ message: "All fields are required." });
//   }

//   const message = {
//     notification: {
//       title: title,
//       body: body,
//     },
//     token: token,
//   };

//   try {
//     await admin.messaging().send(message);
//     const notificationData = await Notification.create({ userId, title, body });
//     res.status(200).json({ message: "Notification sent successfully", data: notificationData });
//   } catch (error) {
//     console.error("Error sending notification:", error);
//     res.status(500).json({ message: "Failed to send notification", error });
//   }
// };

exports.getNotificationsByUserId = async (req, res) => {
  const receiverId = req.user.userId;

  if (!receiverId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  try {
    const notifications = await Notification.find({ receiverId }).sort({ createdAt: -1 });
    if (notifications.length === 0) {
      return res.status(200).json({ message: "No notifications found for this user.", data: [] });
    }
    return res.status(200).json({ message: "Notifications fetched successfully.", data: notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ message: "Internal Server Error." });
  }
};

// ReadNotification
exports.ReadNotification = async (req, res) => {
  const receiverId = req.user.userId;
  const notificationId = req.params.notificationId; // Assuming notificationId is passed in the request

  if (!receiverId || !notificationId) {
    return res.status(400).json({
      status: 400,
      success: false,
      message: "Receiver ID and notification ID are required.",
      data: [],
    });
  }

  try {
    // Find the notification by ID and receiverId
    const notification = await Notification.findOne({ _id: notificationId, receiverId });

    if (!notification) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Notification not found.",
        data: [],
      });
    }

    // Update the notification to mark it as read
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

// ALL Read Notifications
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
    const { userId, title, body, receiverId } = req.body;

    

    const newNotification = new Notification({
      userId,
      receiverId,
      title,
      body,
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



