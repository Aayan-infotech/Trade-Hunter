const Notification = require('../models/notificationAcceptModel');

const express = require('express');

// Create a new notification
exports.createNotification = async (req, res) => {
  try {
    const { providerId, hunterID, jobId, text } = req.body;
    const notification = new Notification({ providerId, hunterID, jobId, text });
    await notification.save();
    res.status(201).json({ message: 'Notification created successfully', notification });
  } catch (error) {
    res.status(500).json({ message: 'Error creating notification', error: error.message });
  }
};

// Get all notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};

// Get a single notification by ID
exports.getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notification', error: error.message });
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notification', error: error.message });
  }
};

// // Express router setup (optional, if you use separate routes file)
// const router = express.Router();
// router.post('/', exports.createNotification);
// router.get('/', exports.getNotifications);
// router.get('/:id', exports.getNotificationById);
// router.delete('/:id', exports.deleteNotification);

// module.exports = router;
