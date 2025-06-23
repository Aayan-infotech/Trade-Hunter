const express = require("express");
require('dotenv').config();
const jwt = require("jsonwebtoken");
const router = express.Router();

const HARD_EMAIL = process.env.ADMIN_EMAIL;
const HARD_PASSWORD = process.env.ADMIN_PASSWORD;
const AdminId = "YWF5YW5pbmZvdGVjaEBnbWFpbC5jb20=";

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email !== HARD_EMAIL || password !== HARD_PASSWORD) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const payload = { email };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "100d" });

  res.json({ token, adminId: AdminId });
});

module.exports = router;
