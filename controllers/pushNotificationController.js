const admin = require("../config/firebaseConfig");
const Notification = require("../models/pushNotificationModel");
const massNotification = require("../models/massNotification");
const DeviceToken = require("../models/devicetokenModel");
const Hunter = require("../models/hunterModel");
const Provider = require("../models/providerModel");
const SubscriptionVoucherUser = require("../models/SubscriptionVoucherUserModel");
const JobPost = require("../models/jobpostModel"); // Import the Job
const mongoose = require("mongoose");

exports.sendPushNotification = async (req, res) => {
  try {
    const { title, body, receiverId, notificationType } = req.body;
    const userId = req.user.userId;

    // Validate inputs
    if (!title || !body || !receiverId || !notificationType) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Title, body, receiverId and notificationType are required.",
        data: [],
      });
    }

    // Validate notification type
    const validTypes = [
      "job_alert",
      "voucher_update",
      "job_accept",
      "job_complete",
    ];
    if (!validTypes.includes(notificationType)) {
      return res.status(400).json({
        status: 400,
        success: false,
        message:
          "Invalid notificationType. Allowed types: " + validTypes.join(", "),
        data: [],
      });
    }

    // Try finding device token
    const device = await DeviceToken.findOne({ userId: receiverId });
    let shouldSend = false;
    let messageSent = false;

    if (device) {
      // Check userType and notification setting
      if (device.userType === "provider") {
        const provider = await Provider.findById(receiverId);
        if (provider?.isNotificationEnable) shouldSend = true;
      } else if (device.userType === "hunter") {
        const hunter = await Hunter.findById(receiverId);
        if (hunter?.isNotificationEnable) shouldSend = true;
      }

      // Send push if allowed and token is present
      if (shouldSend && device.deviceToken) {
        try {
          const message = {
            notification: { title, body },
            token: device.deviceToken,
          };

          await admin.messaging().send(message);
          messageSent = true;
        } catch (fcmError) {
          console.warn("FCM send error:", fcmError.message);
        }
      }
    } else {
      console.warn(`No device token found for user ${receiverId}`);
    }

    // Always save the notification
    const notificationData = await Notification.create({
      userId,
      title,
      body,
      receiverId,
      notificationType,
    });
    const io = req.app.get("io");
    io.emit("Admin Notification", notificationData);
    return res.status(200).json({
      status: 200,
      success: true,
      message: messageSent
        ? "Notification sent and saved."
        : "Notification saved. Not sent due to missing token or disabled settings.",
      data: [notificationData],
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Failed to process notification request.",
      data: [],
      error: error.message,
    });
  }
};

exports.sendPushNotificationAdmin = async (req, res) => {
  try {
    const { title, body, receiverId } = req.body;

    if (!title || !body || !receiverId) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Title, body, and receiverId are required.",
        data: [],
      });
    }

    const device = await DeviceToken.findOne({ userId: receiverId });
    const deviceToken = device?.deviceToken || null;

    const notificationData = await Notification.create({
      title,
      body,
      receiverId: new mongoose.Types.ObjectId(receiverId),
      notificationType: "admin_message",
      isRead: false,
    });

    let fcmSent = false;
    if (deviceToken) {
      try {
        await admin.messaging().send({
          notification: { title, body },
          token: deviceToken,
        });
        fcmSent = true;
      } catch (fcmError) {
        console.warn("FCM send error (ignored):", fcmError.message);
      }
    }


    return res.status(200).json({
      status: 200,
      success: true,
      message: fcmSent
        ? "Notification sent and saved successfully."
        : deviceToken
        ? "Notification saved but push failed or disabled."
        : "Notification saved but not sent (no device token).",
      data: [notificationData],
    });
  } catch (error) {
    console.error("Error in sendPushNotificationAdmin:", error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Failed to send notification.",
      data: [],
      error: error.message,
    });
  }
};

// NotificationController.js
exports.getNotificationsByUserId = async (req, res) => {
  try {
    const receiverId = req.user.userId;
    const userType = req.params.userType;

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Invalid user ID format.",
      });
    }

    const ObjectId = mongoose.Types.ObjectId;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    // 1) Fetch personal notifications (EXCLUDE deletedBy user)
    const personalNotifs = await Notification.find({
      receiverId: new ObjectId(receiverId),
      deletedBy: { $ne: new ObjectId(receiverId) },
    }).lean();

    // 2) Enrich personal notifications
    const enrichedPersonal = await Promise.all(
      personalNotifs.map(async (notif) => {
        let userName = null;

        if (notif.notificationType === "admin_message") {
          userName = "Admin";
        } else if (notif.userId) {
          const sender =
            (await Provider.findById(notif.userId).select("name")) ||
            (await Hunter.findById(notif.userId).select("name"));
          userName = sender?.name || null;
        }

        let jobDetails = null;
        if (notif.jobId) {
          const job = await JobPost.findById(notif.jobId)
            .select("title jobStatus completionNotified")
            .lean();
          if (job) {
            jobDetails = {
              _id: job._id,
              title: job.title,
              jobStatus: job.jobStatus,
              completionNotified: job.completionNotified,
            };
          }
        }

        return {
          ...notif,
          userName,
          isRead: !!notif.isRead,
          jobDetails,
        };
      })
    );

    // 3) Find join date
    const joinRecord =
      userType === "provider"
        ? await Provider.findById(receiverId).select("createdAt").lean()
        : await Hunter.findById(receiverId).select("createdAt").lean();
    const joinDate = joinRecord?.createdAt || new Date(0);

    // 4) Fetch mass notifications (EXCLUDE deleted + read)
    const massNotifs = await massNotification.find({
      userType,
      createdAt: { $gte: joinDate },
      readBy: { $ne: new ObjectId(receiverId) },
    }).lean();

    const formattedMass = massNotifs.map((mn) => ({
      ...mn,
      isRead: mn.readBy?.some((id) => id.toString() === receiverId),
    }));

    // 5) Combine, paginate, return
    const allNotifs = [...enrichedPersonal, ...formattedMass].sort(
      (a, b) => b.createdAt - a.createdAt
    );

    const total = allNotifs.length;
    const totalPages = Math.ceil(total / limit);
    const paginated = allNotifs.slice(skip, skip + limit);
    const unreadCount = allNotifs.reduce(
      (cnt, n) => cnt + (n.isRead ? 0 : 1),
      0
    );

    return res.status(200).json({
      status: 200,
      success: true,
      data: paginated,
      pagination: {
        total,
        currentPage: page,
        totalPages,
      },
      unreadCount,
      message: "Fetched all valid notifications with pagination!",
    });
  } catch (error) {
    console.error("Error in getNotificationsByUserId:", error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: error.message,
    });
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
      const notification = await Notification.findOne({
        _id: notificationId,
        receiverId: receiverId,
      });

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
      const notification = await massNotification.findOne({
        _id: notificationId,
      });

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
    const io = req.app.get("io");
    const { title, body, receiverId, notificationType, jobId } = req.body;
    const userId = req.user.userId;
    
    if (!title || !body || !receiverId || !notificationType) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Title, body, receiverId and notificationType are required.",
        data: [],
      });
    }

    const validTypes = [
      "job_alert",
      "voucher_update",
      "job_accept",
      "job_complete",
    ];
    if (!validTypes.includes(notificationType)) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Invalid notificationType. Allowed types: " + validTypes.join(", "),
        data: [],
      });
    }

    const device = await DeviceToken.findOne({ userId: receiverId });
    let shouldSend = false;
    let messageSent = false;

    if (device) {
      if (device.userType === "provider") {
        const provider = await Provider.findById(receiverId);
        if (provider?.isNotificationEnable) shouldSend = true;
      } else if (device.userType === "hunter") {
        const hunter = await Hunter.findById(receiverId);
        if (hunter?.isNotificationEnable) shouldSend = true;
      }

      if (shouldSend && device.deviceToken) {
        try {
          const message = {
            notification: { title, body },
            token: device.deviceToken,
          };
          await admin.messaging().send(message);
          messageSent = true;
        } catch (fcmError) {
          console.warn("FCM send error:", fcmError.message);
        }
      }
    } else {
      console.warn(`No device token found for user ${receiverId}`);
    }

    const newNotification = await Notification.create({
      userId,
      receiverId,
      title,
      body,
      notificationType,
      jobId,
      createdAt: new Date(),
    });

    io.emit("newNotification", {
      _id: newNotification._id,
      userId,
      receiverId,
      title,
      body,
      notificationType,
      jobId,
      createdAt: newNotification.createdAt,
      isRead: false,
    });

    return res.status(201).json({
      status: 201,
      success: true,
      message: messageSent
        ? "Notification sent via push and socket."
        : "Notification saved and socket sent. Push skipped due to settings or token.",
      data: newNotification,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


exports.sendAdminNotification = async (req, res) => {
  try {
    const { title, body } = req.body;
    const { receiverId } = req.params;

    const notificationType = "admin_message";

    if (!title || !body || !receiverId) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Title, body, and receiverId are required.",
        data: [],
      });
    }

    const notificationData = await Notification.create({
      title,
      body,
      receiverId,
      notificationType,
    });

    const device = await DeviceToken.findOne({ userId: receiverId });

    if (!device || !device.deviceToken || typeof device.deviceToken !== 'string' || device.deviceToken.trim() === "") {
      return res.status(200).json({
        status: 200,
        success: true,
        message: "Notification saved but not sent (invalid or missing device token).",
        data: [notificationData],
      });
    }

    const message = {
      notification: { title, body },
      token: device.deviceToken,
    };

    await admin.messaging().send(message);

    res.status(200).json({
      status: 200,
      success: true,
      message: "Notification sent successfully.",
      data: [notificationData],
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({
      status: 500,
      success: false,
      message: "Failed to send notification.",
      data: [],
      error: error.message,
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
      notificationType: "admin_message",
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

    const deletedNotification = await Notification.findByIdAndDelete(
      notificationId
    );

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

exports.deleteNotificationByIdforUser = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId;

    if (!notificationId || !userId) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Notification ID and User ID are required.",
        data: [],
      });
    }

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Notification not found.",
        data: [],
      });
    }

    if (!notification.deletedBy || notification.deletedBy.toString() !== userId) {
      notification.deletedBy = userId;
      await notification.save();
    }

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Notification deleted from user view.",
      data: [notification],
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


exports.updateNotificationStatus = async (req, res) => {
  try {
    const { id, type } = req.params;
    const { isNotificationEnable } = req.body;

    if (typeof isNotificationEnable !== "boolean") {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "isNotificationEnable must be true or false.",
        data: [],
      });
    }
    let updatedUser;
    if (type === "hunter") {
      updatedUser = await Hunter.findByIdAndUpdate(
        id,
        { isNotificationEnable },
        { new: true }
      );
    } else if (type === "provider") {
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
      status: "active",
    });

    if (expiringVouchers.length > 0) {
      return res.status(200).json({
        message: "You have vouchers expiring within 24 hours.",
        data: expiringVouchers,
      });
    } else {
      return res.status(200).json({
        message: "No vouchers expiring within 24 hours.",
      });
    }
  } catch (error) {
    console.error("Error fetching expiring vouchers:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


exports.getUnreadNotificationCount = async (req, res) => {
  try {
    const receiverId = req.user.userId;
    const userType = req.params.userType;

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Invalid user ID format.",
      });
    }

    const ObjectId = mongoose.Types.ObjectId;

    const personalUnreadCount = await Notification.countDocuments({
      receiverId: new ObjectId(receiverId),
      deletedBy: { $ne: new ObjectId(receiverId) },
      isRead: { $ne: true },
    });
    const joinRecord =
      userType === "provider"
        ? await Provider.findById(receiverId).select("createdAt").lean()
        : await Hunter.findById(receiverId).select("createdAt").lean();
    const joinDate = joinRecord?.createdAt || new Date(0);

    const massUnreadCount = await massNotification.countDocuments({
      userType,
      createdAt: { $gte: joinDate },
      readBy: { $ne: new ObjectId(receiverId) },
    });

    const unreadCount = personalUnreadCount + massUnreadCount;

    return res.status(200).json({
      status: 200,
      success: true,
      unreadCount,
      message: "Fetched unread notification count successfully!",
    });
  } catch (error) {
    console.error("Error in getUnreadNotificationCount:", error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: error.message,
    });
  }
};
