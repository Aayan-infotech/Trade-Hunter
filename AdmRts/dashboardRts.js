const express = require("express");
const router = express.Router();
const {
    getTotalCount,
    getActiveUsersCount,
} = require("../AdmCtrl/dashboardApi");
const { verifyUser } = require("../middlewares/auth");

router.get("/totalUsers",verifyUser,  getTotalCount);
router.get("/activeUsers",verifyUser,  getActiveUsersCount)

module.exports = router;