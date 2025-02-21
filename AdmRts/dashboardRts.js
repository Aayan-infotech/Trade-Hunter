const express = require("express");
const router = express.Router();
const {
    getTotalCount,

} = require("../AdmCtrl/dashboardApi");

router.get("/totalUsers", getTotalCount);

module.exports = router;