const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const HARD_EMAIL = "aayaninfotech@gmail.com";
const HARD_PASSWORD = "aayaninfotech";
const AdminId = "YWF5YW5pbmZvdGVjaEBnbWFpbC5jb20=";

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email !== HARD_EMAIL || password !== HARD_PASSWORD) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const payload = { email };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

  res.json({ token, adminId: AdminId });
});

module.exports = router;
