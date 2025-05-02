const express = require("express");
const router = express.Router();
const Contact = require("../models/contactUsModel");

exports.createContact = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res
        .status(400)
        .json({ message: "Name, email, and message are required." });
    }

    const newContact = new Contact({ name, email, message });
    await newContact.save();

    // Emit socket event to frontend
    const io = req.app.get("io");
    io.emit("newContact", newContact); // 💥 send to all connected clients

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
