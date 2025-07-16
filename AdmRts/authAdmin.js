const express = require("express");
require('dotenv').config();
const jwt = require("jsonwebtoken");
const { getSecrets } = require("../utils/awsSecrets");

const router = express.Router();

let secrets;

// Load secrets from AWS at startup
(async () => {
  try {
    secrets = await getSecrets();
    if (!secrets.ADMIN_EMAIL || !secrets.ADMIN_PASSWORD || !secrets.JWT_SECRET) {
      console.error("❌ Missing ADMIN_EMAIL, ADMIN_PASSWORD, or JWT_SECRET in AWS Secrets");
    }
  } catch (err) {
    console.error("❌ Failed to load admin login secrets from AWS:", err);
  }
})();

const AdminId = "YWF5YW5pbmZvdGVjaEBnbWFpbC5jb20=";

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!secrets || !secrets.ADMIN_EMAIL || !secrets.ADMIN_PASSWORD || !secrets.JWT_SECRET) {
      return res.status(500).json({ message: "Server configuration not ready" });
    }

    if (email !== secrets.ADMIN_EMAIL || password !== secrets.ADMIN_PASSWORD) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const payload = { email };
    const token = jwt.sign(payload, secrets.JWT_SECRET, { expiresIn: "100d" });

    res.json({ token, adminId: AdminId });
  } catch (err) {
    console.error("❌ Error in admin login:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
