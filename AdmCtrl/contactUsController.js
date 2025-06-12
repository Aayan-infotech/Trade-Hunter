const express = require("express");
const router = express.Router();
const Contact = require("../models/contactUsModel");
const sendEmail = require("../services/contactUsMail");

exports.createContact = async (req, res) => {
  try {
    const { name, email, message, userType } = req.body;

    if (!name || !email || !message || !userType) {
      return res
        .status(400)
        .json({ message: "Name, email,userType and message are required." });
    }

    const newContact = new Contact({
      name,
      email,
      message,
      userType,
      isRead: false,
    });
    await newContact.save();

    const subject = "📨  Contact Request Received";
    const htmlMessage = `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f9f9; padding: 30px;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
      
      <!-- Header -->
      <div style="background-color: #004aad; color: white; padding: 20px 30px; text-align: center;">
        <h1 style="margin: 0;">📨  Contact Request</h1>
        <p style="margin: 5px 0 0;">You've received a  message from your website</p>
      </div>
      
      <!-- Content -->
      <div style="padding: 25px 30px;">
        <p style="font-size: 16px;">Hello Admin,</p>
        <p style="font-size: 15px;">A user has submitted a contact request. Here are the details:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 8px; font-weight: bold;">👤 Name:</td>
            <td style="padding: 8px;">${name}</td>
          </tr>
          <tr style="background-color: #f1f5f9;">
            <td style="padding: 8px; font-weight: bold;">📧 Email:</td>
            <td style="padding: 8px;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">🔖 User Type:</td>
            <td style="padding: 8px;">${userType}</td>
          </tr>
        </table>

        <div style="margin-top: 25px;">
          <h3 style="margin-bottom: 10px;">📝 Message:</h3>
          <div style="background-color: #f0f4f8; padding: 15px 20px; border-left: 5px solid #004aad; border-radius: 5px; font-size: 15px;">
            ${message}
          </div>
        </div>
        
        <p style="margin-top: 30px; font-size: 13px; color: gray; text-align: center;">
          This is an automated message. Please do not reply directly to this email.
        </p>
      </div>
      
    </div>
  </div>
`;

    await sendEmail("tradehunters2025@gmail.com", subject, htmlMessage);

    const io = req.app.get("io");
    io.emit("newContact", newContact);

    res.status(201).json({
      message: "Thank you for contacting us, we will get back to you soon.",
      contact: newContact,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.getAllContacts = async (req, res) => {
  try {
    const contacts = await Contact.find();
    res.status(200).json({ contacts });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.deleteContact = async (req, res) => {
  try {
    const contactId = req.params.id;
    const deletedContact = await Contact.findByIdAndDelete(contactId);

    if (!deletedContact) {
      return res.status(404).json({ message: "Contact not found" });
    }

    res.status(200).json({
      message: "Contact deleted successfully",
      contact: deletedContact,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.getReadCount = async (req, res) => {
  try {
    const count = await Contact.countDocuments({ isRead: false });
    res.json({ isReadCount: count });
  } catch (error) {
    console.error("Error fetching read count:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Mark all contacts as read
exports.markAllAsRead = async (req, res) => {
  try {
    const result = await Contact.updateMany({}, { isRead: true });
    res.json({
      message: "All messages marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error updating contacts:", error);
    res.status(500).json({ error: "Server error" });
  }
};
