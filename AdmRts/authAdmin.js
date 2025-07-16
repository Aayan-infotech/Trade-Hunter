const express = require("express");
const jwt = require("jsonwebtoken");
const { getSecrets } = require("../utils/awsSecrets");
const router = express.Router();

const AdminId = "YWF5YW5pbmZvdGVjaEBnbWFpbC5jb20=";

let secrets; // this will hold the AWS secrets

(async () => {
  try {
    secrets = await getSecrets();
    if (!secrets?.ADMIN_EMAIL || !secrets?.ADMIN_PASSWORD || !secrets?.JWT_SECRET) {
      console.error("❌ Missing secrets from AWS");
    } else {
      console.log("✅ AWS secrets loaded successfully");
    }
  } catch (err) {
    console.error("❌ Error loading AWS secrets:", err);
  }
})();

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!secrets) {
    return res.status(500).json({ message: "Secrets not initialized" });
  }

  if (email !== secrets.ADMIN_EMAIL || password !== secrets.ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const payload = { email };
  const token = jwt.sign(payload, secrets.JWT_SECRET, { expiresIn: "100d" });

  res.json({ token, adminId: AdminId });
});

module.exports = router;
