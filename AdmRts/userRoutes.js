const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUsersByType,
  getUserById,
  updateUser,
  deleteUser,
  getJobPostsByUser
} = require("../AdmCtrl/userController");

router.get("/", getAllUsers);
router.get("/type/:hunte/pagelimit/:limit", getUsersByType);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
router.get('/jobposts/:userId', getJobPostsByUser);
module.exports = router;