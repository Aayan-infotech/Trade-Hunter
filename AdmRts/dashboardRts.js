const express = require("express");
const router = express.Router();
const {
    getTotalCount,
    getActiveUsersCount,
} = require("../AdmCtrl/dashboardApi");

router.get("/totalUsers", getTotalCount);
router.get("/activeUsers", getActiveUsersCount)

module.exports = router;