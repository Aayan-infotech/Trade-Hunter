// const admin = require('../config/firebaseConfig');
const Notification = require("../models/pushNotificationModel");

exports.sendPushNotification = async (req, res) => {
  const { userId, token, title, body } = req.body; 

  if (!userId || !token || !title || !body) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const message = {
    notification: {
      title: title,
      body: body,
    },
    token: token,
  };

  try {
    await admin.messaging().send(message);
    const notificationData = await Notification.create({ userId, title, body });
    res.status(200).json({ message: "Notification sent successfully", data: notificationData });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({ message: "Failed to send notification", error });
  }
};

exports.getNotificationsByUserId = async (req, res) => {
  const { userId } = req.params; 

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  try {
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    if (notifications.length === 0) {
      return res.status(200).json({ message: "No notifications found for this user.", data: [] });
    }
    return res.status(200).json({ message: "Notifications fetched successfully.", data: notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ message: "Internal Server Error." });
  }
};