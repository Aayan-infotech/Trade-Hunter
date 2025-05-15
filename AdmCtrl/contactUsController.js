const express = require("express");
const router = express.Router();
const Contact = require("../models/contactUsModel");
const sendEmail = require("../services/sendMail"); 

exports.createContact = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res
        .status(400)
        .json({ message: "Name, email, and message are required." });
    }

    const newContact = new Contact({ name, email, message, isRead: false });
    await newContact.save();

    const subject = "📨 New Contact Request Received";
    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>🔔 New Contact Follow-up</h2>
        <p>You have received a new follow-up from:</p>
        <ul>
          <li><strong>Name:</strong> ${name}</li>
          <li><strong>Email:</strong> ${email}</li>
        </ul>
        <p><strong>Message:</strong> ${message}</p>
        <p style="font-size: 12px; color: gray;">This is an automated email from Trade Hunter</p>
      </div>
    `;
    await sendEmail("rishabh.sharma@aayaninfotech.com", subject, htmlMessage);

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
    res.json({ message: "All messages marked as read", modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error("Error updating contacts:", error);
    res.status(500).json({ error: "Server error" });
  }
};
