const express = require('express');
const { createNotification, getAllNotifications, getUnreadCount, deleteMultipleNotifications, markMultipleAsRead } = require('../controllers/notifcationController');
const router = express.Router();

router.post('/create-notification', createNotification);
router.get('/notifications/:userId', getAllNotifications);
router.get('/notifications/unread-count/:userId', getUnreadCount);
router.delete('/notifications/delete-multiple', deleteMultipleNotifications);
router.put('/notifications/mark-multiple-as-read', markMultipleAsRead);

module.exports = router;