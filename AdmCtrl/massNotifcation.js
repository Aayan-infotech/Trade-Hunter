const express = require('express');
const router = express.Router();

const Hunter = require('../models/hunterModel');
const Provider = require('../models/providerModel');
const Notification = require('../models/massNotification');

const sendNotificationToUser = (user,subject, message) => {
  console.log(`Sending notification to ${user.email}: ${message}`);
};

exports.sendMassNotification = async (req, res) => {
  try {
    const { userType,subject, message } = req.body;

    if (!userType ||!subject || !message) {
      return res.status(400).json({ error: 'Missing userType or message.' });
    }

    const notification = new Notification({ userType,subject, message });
    await notification.save();

    let users = [];
    if (userType === "hunter") {
      users = await Hunter.find();
    } else if (userType === "provider") {
      users = await Provider.find();
    } else {
      return res.status(400).json({ error: 'Invalid userType provided.' });
    }

    if (!users.length) {
      return res.status(404).json({ error: 'No users found for the given userType.' });
    }

    users.forEach(user => sendNotificationToUser(user, subject, message));

    notification.status = 'sent';
    await notification.save();

    return res.status(200).json({ message: 'Notifications sent successfully.' });
  } catch (error) {
    console.error("Error in sending notifications:", error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getMassNotifications = async (req, res) => {
  try {
    const { userType } = req.query;
    let query = {};

    if (userType) {
      query.userType = userType;
    }

    const notifications = await Notification.find(query).sort({ createdAt: -1 });
    return res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};
