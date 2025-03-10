const express=require("express")
const {createNotification,getNotifications,getNotificationById,deleteNotification } = require("../controllers/notificationAcceptControllers")
const router = express.Router();

router.post('/', createNotification);
router.get('/', getNotifications);
router.get('/:id', getNotificationById);
router.delete('/:id', deleteNotification);

module.exports=router