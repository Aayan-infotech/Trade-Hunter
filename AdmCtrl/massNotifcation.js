const express = require("express");
const router = express.Router();
const Hunter = require("../models/hunterModel");
const Provider = require("../models/providerModel");
const Notification = require("../models/massNotification");
const admin = require("../config/firebaseConfig");
const deviceTokenModel = require("../models/devicetokenModel");
const massEmail = require("../services/massNotificationMail")
const mongoose = require("mongoose");

const pushNotification = async (subject, message, deviceToken) => {
  try {
    const sendmessage = {
      notification: {
        title: subject,
        body: message,
      },
      token: deviceToken,
    };

    await admin
      .messaging()
      .send(sendmessage)
      .then((response) => {
        console.log("Successfully sent message:", response);
      })
      .catch((error) => {
        console.log("Error sending message:", error);
      });
  } catch (e) {
    return e.message;
  }
};

exports.sendMassNotification = async (req, res) => {
  try {
    const { userType, subject, message } = req.body;

    if (!userType || !subject || !message) {
      return res.status(400).json({ error: "Missing userType, subject, or message." });
    }

    const notification = new Notification({
      userType,
      title: subject,
      body: message,
    });
    await notification.save();

    res.status(200).json({
      status: 200,
      message: "Notification created. Push and email are being processed in background.",
    });

    setImmediate(async () => {
      try {
        // 1. PUSH NOTIFICATIONS
        const deviceTokenEntries = await deviceTokenModel.find({ userType });
        const pushPromises = [];
        for (const entry of deviceTokenEntries) {
          if (entry.deviceToken) {
            const push = pushNotification(subject, message, entry.deviceToken).catch(console.error);
            pushPromises.push(push);
          }
        }
        await Promise.all(pushPromises);
        console.log("Push notifications sent successfully.");

        // 2. EMAILS (ONE BY ONE!)
        let users = [];
        if (userType === "hunter") {
          users = await Hunter.find({}, "email firstName lastName");
        } else if (userType === "provider") {
          users = await Provider.find({}, "email contactName");
        }

        // Filter to only emails and take names if available
        let notifiedCount = 0;
        for (const user of users) {
          const email = user.email;
          if (!email) continue;

          // Pick a display name if possible
          let displayName = "there";
          if (user.firstName) displayName = user.firstName;
          else if (user.contactName) displayName = user.contactName;

          const htmlContent = `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f6fa; padding: 32px;">
              <div style="max-width: 640px; margin: auto; background: #ffffff; border-radius: 14px; box-shadow:0 4px 24px 0 rgba(0,0,0,0.07); overflow: hidden;">
                <div style="background: linear-gradient(90deg, #004aad, #145acf); color: #fff; padding: 32px 20px 20px 20px;">
                  <h2 style="margin: 0 0 8px 0;">Trade Hunters Notification</h2>
                  <p style="font-size: 19px; font-weight: 500; line-height: 1.5; margin:0;"></p>
                </div>
                <div style="padding: 32px 20px 26px 20px;">
                  <p style="font-size: 16px;">Hello,</p>
                   <div style="font-size: 15px; line-height: 1.7; margin: 18px 0;">
                    <div style="display: flex;flex-direction: row;align-items:start">
                    <b>Subject:</b><p style="margin:0">${subject}</p>
                    </div>
                  </div>
                  <div style="font-size: 15px; line-height: 1.7; margin: 18px 0;">
                    <div style="display: flex;flex-direction: row;align-items:start">
                    <b>Message:</b><p style="margin:0"> ${message}</p>
                    </div>
                  </div>
                  <hr style="border:none; border-top:1px solid #e1e6eb; margin:32px 0 17px 0" />
                  <div style="color:#7a869a; font-size:12px; text-align:center;">
                    This is an automated notification from Trade Hunters.<br>
                    Please do not reply to this email.
                  </div>
                </div>
              </div>
            </div>

          `;

          try {
            await massEmail(email, subject, htmlContent);
            notifiedCount++;
          } catch (emailErr) {
            console.error(`Failed to email ${email}:`, emailErr);
          }
        }

        if (notifiedCount > 0) {
          console.log(`Mass email sent successfully to ${notifiedCount} users.`);
        } else {
          console.warn("No email addresses notified.");
        }
      } catch (bgError) {
        console.error("Error during background processing:", bgError);
      }
    });

  } catch (error) {
    console.error("Error in sendMassNotification:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};





exports.getMassNotifications = async (req, res) => {
  try {
    const { userType } = req.query;
    let query = {};

    if (userType) {
      query.userType = userType;
    }

    const notifications = await Notification.find(query).sort({
      createdAt: -1,
    });
    return res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

exports.getAllMassNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    return res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching all notifications:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

exports.deleteNotificationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid notification ID." });
    }

    const deletedNotification = await Notification.findByIdAndDelete(id);

    if (!deletedNotification) {
      return res.status(404).json({ error: "Notification not found." });
    }

    res.status(200).json({
      message: "Notification deleted successfully.",
      data: deletedNotification,
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

exports.deleteForUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const notifId = req.params.id;

    await Notification.findByIdAndUpdate(
      notifId,
      { $addToSet: { deletedBy: userId } },
      { new: true }
    );

    return res.status(200).json({ message: "Notification removed for you." });
  } catch (err) {
    console.error("Error deleting notification for user:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};


