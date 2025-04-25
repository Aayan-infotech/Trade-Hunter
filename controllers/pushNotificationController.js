const admin = require('../config/firebaseConfig');
const Notification = require("../models/pushNotificationModel");
const massNotification = require('../models/massNotification');
const DeviceToken = require("../models/devicetokenModel");
const Hunter = require("../models/hunterModel");
const Provider = require("../models/providerModel");
const SubscriptionVoucherUser = require('../models/SubscriptionVoucherUserModel');


// exports.sendPushNotification = async (req, res) => {
//   try {
//     const { title, body, receiverId, notificationType } = req.body;
//     const userId = req.user.userId;

//     if (!title || !body || !receiverId || !notificationType) {
//       return res.status(400).json({
//         status: 400,
//         success: false,
//         message: "Title and body are required.",
//         data: []
//       });
//     }
//     // Validate notificationType
//     const validTypes = ['job_alert', 'voucher_update', 'job_accept', 'job_complete'];
//     if (!validTypes.includes(notificationType)) {
//       return res.status(400).json({
//         status: 400,
//         success: false,
//         message: "Invalid notificationType. Allowed types: " + validTypes.join(", "),
//         data: []
//       });
//     }

//     const device = await DeviceToken.findOne({ userId });
//     if (!device) {
//       return res.status(404).json({
//         status: 404,
//         success: false,
//         message: "Device token not found for the user.",
//         data: []
//       });
//     }

//     const message = {
//       notification: { title, body },
//       token: device.deviceToken,
//     };

//     await admin.messaging().send(message);
//     const notificationData = await Notification.create({ userId, title, body, receiverId, notificationType });

//     res.status(200).json({
//       status: 200,
//       success: true,
//       message: "Notification sent successfully.",
//       data: [notificationData]
//     });
//   } catch (error) {
//     console.error("Error sending notification:", error);
//     res.status(500).json({
//       status: 500,
//       success: false,
//       message: "Failed to send notification.",
//       data: [],
//       error: error.message
//     });
//   }
// };


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

    const validTypes = ['job_alert', 'voucher_update', 'job_accept', 'job_complete'];
    if (!validTypes.includes(notificationType)) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Invalid notificationType. Allowed types: " + validTypes.join(", "),
        data: []
      });
    }

    const device = await DeviceToken.findOne({ userId: receiverId });

    if (!device) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Device token not found for the user.",
        data: []
      });
    }

    // 🧠 Check isNotificationEnable based on userType provider and hunter
    let shouldSend = false;

    if (device.userType === "provider") {
      const provider = await Provider.findById(receiverId);
      if (provider && provider.isNotificationEnable === true) {
        shouldSend = true;
      }
    } else if (device.userType === "hunter") {
      const hunter = await Hunter.findById(receiverId);
      if (hunter && hunter.isNotificationEnable === true) {
        shouldSend = true;
      }
    }

    let notificationData = null;

    if (shouldSend) {
      const message = {
        notification: { title, body },
        token: device.deviceToken,
      };

      await admin.messaging().send(message);
    }

    // Always store notification in DB, even if not sent
    notificationData = await Notification.create({
      userId,
      title,
      body,
      receiverId,
      notificationType
    });

    return res.status(200).json({
      status: 200,
      success: true,
      message: shouldSend
        ? "Notification sent successfully."
        : "Notification saved but not sent (notifications disabled).",
      data: [notificationData],
    });

  } catch (error) {
    console.error("Error sending notification:", error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Failed to send notification.",
      data: [],
      error: error.message,
    });
  }
};


exports.getNotificationsByUserId = async (req, res) => {
  try {
    const receiverId = req.user.userId;
    const userType = req.params.userType;

    const userNotifications = await Notification.find({ receiverId });
    const massNotifications = await massNotification.find({ userType });
    const formattedMassNotifications = massNotifications.map((notif) => ({
      ...notif._doc,
      isRead: notif.readBy.includes(receiverId),
    }));

    const allNotifications = [...userNotifications, ...formattedMassNotifications];
    allNotifications.sort((a, b) => b.createdAt - a.createdAt);
    res.status(200).json({
      status: 200,
      success: true,
      data: allNotifications,
      message: "get all notification!"
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
  try {
    const receiverId = req.user.userId;
    const { notificationId, type } = req.params;

    if (!receiverId || !notificationId) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Receiver ID and notification ID are required.",
        data: [],
      });
    }

    if (type === "push") {
      const notification = await Notification.findOne({ _id: notificationId, receiverId: receiverId });

      if (!notification) {
        return res.status(404).json({
          status: 404,
          success: false,
          message: "Notification not found.",
        });
      }

      notification.isRead = true;
      await notification.save();
    } else if (type === "mass") {
      const notification = await massNotification.findOne({ _id: notificationId });

      if (!notification) {
        return res.status(404).json({
          status: 404,
          success: false,
          message: "Mass notification not found.",
        });
      }

      if (!notification.readBy.includes(receiverId)) {
        notification.readBy.push(receiverId);
        await notification.save();
      }
    } else {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Invalid notification type.",
      });
    }

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Notification marked as read.",
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

// Notification setting both hunter and provider
exports.updateNotificationStatus = async (req, res) => {
  try {
    const { id, type } = req.params;
    const { isNotificationEnable } = req.body;

    if (typeof isNotificationEnable !== 'boolean') {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "isNotificationEnable must be true or false.",
        data: [],
      });
    }
    let updatedUser;
    if (type === 'hunter') {
      updatedUser = await Hunter.findByIdAndUpdate(
        id,
        { isNotificationEnable },
        { new: true }
      );
    } else if (type === 'provider') {
      updatedUser = await Provider.findByIdAndUpdate(
        id,
        { isNotificationEnable },
        { new: true }
      );
    } else {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Invalid type. Must be 'hunter' or 'provider'.",
        data: [],
      });
    }
    if (!updatedUser) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "User not found.",
        data: [],
      });
    }
    return res.status(200).json({
      status: 200,
      success: true,
      message: "Successfully updated notification status.",
      data: [updatedUser],
    });
  } catch (err) {
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Server error",
      data: [],
    });
  }
};


exports.getExpiringSoonVouchers = async (req, res) => {
  try {
    const userId = req.user.userId; 
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const expiringVouchers = await SubscriptionVoucherUser.find({
      userId: userId,
      endDate: { $gte: now, $lte: next24Hours },
      status: 'active'
    });

    if (expiringVouchers.length > 0) {
      return res.status(200).json({
        message: 'You have vouchers expiring within 24 hours.',
        data: expiringVouchers
      });
    } else {
      return res.status(200).json({
        message: 'No vouchers expiring within 24 hours.'
      });
    }
  } catch (error) {
    console.error('Error fetching expiring vouchers:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};



/*const getExpiringSoonVouchers = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const expiringItems = await SubscriptionVoucherUser.find({
      userId: userId,
      endDate: { $gte: now, $lte: next24Hours },
      status: 'active'
    });

    const expiringSubscriptions = expiringItems.filter(item => item.type === 'subscription');
    const expiringVouchers = expiringItems.filter(item => item.type === 'voucher');

    const messages = [];

    if (expiringSubscriptions.length > 0) {
      messages.push('Your subscription will expire within 24 hours.');
    }

    if (expiringVouchers.length > 0) {
      messages.push('Your voucher will expire within 24 hours.');
    }

    if (messages.length > 0) {
      return res.status(200).json({
        message: messages.join(' '),
        data: {
          expiringSubscriptions,
          expiringVouchers
        }
      });
    } else {
      return res.status(200).json({
        message: 'No subscriptions or vouchers expiring within 24 hours.'
      });
    }
  } catch (error) {
    console.error('Error checking expiring items:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}; */