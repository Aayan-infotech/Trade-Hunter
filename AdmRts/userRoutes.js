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
const { verifyUser } = require("../middlewares/auth");

router.get("/",verifyUser, getAllUsers);
router.get("/type/:type/pagelimit/:pagelimit",verifyUser, getUsersByType);
router.get("/:id",verifyUser,  getUserById);
router.put("/:id",verifyUser,  updateUser);
router.delete("/:id",verifyUser, deleteUser);
router.get('/jobposts/:userId',verifyUser, getJobPostsByUser);
module.exports = router;