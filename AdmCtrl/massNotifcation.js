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

        let users = [];
        if (userType === "hunter") {
          users = await Hunter.find({}, "email");
        } else if (userType === "provider") {
          users = await Provider.find({}, "email");
        }

        const emailAddresses = users
          .map(user => user.email)
          .filter(email => !!email); 

        if (emailAddresses.length > 0) {
          const htmlContent = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; padding: 30px; color: #2c3e50;">
              <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
                <div style="background-color: #004aad; color: white; padding: 20px;">
                  <h2 style="margin: 0;"> Trade Hunters MassNotification</h2>
                </div>
                <div style="padding: 25px;">
                  <p style="font-size: 16px;">Hello,</p>
                  <p style="font-size: 15px; line-height: 1.6;">
                    You’ve received a Mass Notification from <strong style="color: #004aad;">Trade Hunters</strong>.
                  </p>
                  <p style="font-size: 15px; margin-top: 20px; line-height: 1.6;">
                    <strong>Subject:</strong> ${subject}<br />
                    <strong>Message:</strong><br />
                    ${message}
                  </p>
                  <div style="margin: 30px 0;">
                    <a href="https://tradehunters.com.au" target="_blank" style="display: inline-block; padding: 12px 20px; background-color: #004aad; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
                      Visit Trade Hunters
                    </a>
                  </div>
                  <hr style="border: none; border-top: 1px solid #e1e4e8;" />
                  <p style="font-size: 12px; color: #95a5a6; text-align: center; margin-top: 20px;">
                    This is an automated notification from Trade Hunters. Please do not reply to this email.
                  </p>
                </div>
              </div>
            </div>
          `;

          await massEmail(emailAddresses, subject, htmlContent);
          console.log("Mass email sent successfully to all users.");
        } else {
          console.warn("No email addresses found.");
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


