const express = require('express');
const router = express.Router();
const Hunter = require('../models/hunterModel');
const Provider = require('../models/providerModel');
const Notification = require('../models/massNotification');
const admin =require('../config/firebaseConfig')
const deviceTokenModel=require('../models/devicetokenModel');


const pushNotification = async (subject, message, deviceToken)=>{
  try {
    const sendmessage = {
        notification: {
          title: subject,
          body: message,
        },
        token:deviceToken
      };

      await admin.messaging().send(sendmessage)
      .then((response) => {
        console.log('Successfully sent message:', response);
      })
      .catch((error) => {
        console.log('Error sending message:', error);
      });
  } catch (e) {
    return e.message
  }
};

exports.sendMassNotification = async (req, res) => {
  try {
    const { userType,subject, message } = req.body;
    const notificationsPromises = [];

    if (!userType ||!subject || !message) {
      return res.status(400).json({ error: 'Missing userType or message.' });
    }

    const notification = new Notification({ userType,title:subject, body:message });
    await notification.save();

    const aggregation=[];

    aggregation.push({
      $match:{
        userType:userType
      }
    });

    const users=await deviceTokenModel.aggregate(aggregation);
    
    for (const user of users) {
      const userId = user.userId;
      const deviceToken = user.deviceToken;
    
      if (deviceToken) {
        const promise = await pushNotification(subject, message, deviceToken)
          .catch(error => {
            console.error(error);
          });
    
        notificationsPromises.push(promise);
      } else {
        console.warn(`User with ID ${userId} does not have a deviceToken.`);
      }
    }

    await Promise.all(notificationsPromises);
    res.status(200).json({
      status: 200,
      message: 'Notifications sent successfully',
    });
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


exports.getAllMassNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    return res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching all notifications:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};