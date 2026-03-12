const { Op } = require("sequelize");
const NotificationModel = require("../models/notification");
const { isEmpty } = require("../services/isEmpty");

const createNotification = async (req, res) => {
    const { userId } = req.params;
    const {title, message, type } = req.body;

        if (!userId || isEmpty(userId)) {
            return res.status(400).json({
              status: "FAILED",
              messsage: "Oops! We need your user ID to proceed.",
            });
          }
          if (!title || isEmpty(title)) {
              return res.status(400).json({
                status: "FAILED",
                messsage: "Oops! We need a notificationtitle to proceed.",
              });
            }
            if (!message || isEmpty(message)) {
                return res.status(400).json({
                  status: "FAILED",
                  messsage: "Oops! We need a notification message to proceed.",
                });
              }
                if (!type || isEmpty(type)) {
                    return res.status(400).json({
                      status: "FAILED",
                      messsage: "Oops! We need a notification type to proceed.",
                    });
                  }

    try {

        const notification = await NotificationModel.create({
            userId,
            title,
            message,
            type
        });

        return res.status(201).json({
            status: "SUCCESS",
            message: "Notification created successfully",
            data: notification
        });

    } catch (error) {
        return res.status(500).json({
            status: "FAILED",
            message: "Internal server error"
        });
    }
};


const getAllNotifications = async (req, res) => {
    const { userId } = req.params;

    if (!userId || isEmpty(userId)) {
        return res.status(400).json({
            status: "FAILED",
            messsage: "Oops! We need your user ID to proceed.",
        });
    }
    try {

        const notifications = await NotificationModel.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']]
        });

        return res.status(200).json({
            status: "SUCCESS",
            data: notifications
        });

    } catch (error) {

        return res.status(500).json({
            status: "FAILED",
            message: "Internal server error"
        });

    }
};

const getUnreadCount = async (req, res) => {
    const { userId } = req.params;
        if (!userId || isEmpty(userId)) {
            return res.status(400).json({
              status: "FAILED",
              messsage: "Oops! We need your user ID to proceed.",
            });
          }

    try {

        const count = await NotificationModel.count({
            where: {
                userId,
                isRead: false
            }
        });

        return res.status(200).json({
            status: "SUCCESS",
            data: count
        });

    } catch (error) {

        return res.status(500).json({
            status: "FAILED",
            message: "Internal server error"
        });

    }

};


const deleteMultipleNotifications = async (req, res) => {
    const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                status: "FAILED",
                message: "Notification id is required"
            });
        }

    try {

        await NotificationModel.destroy({
            where: {
                id: {
                    [Op.in]: ids
                }
            }
        });

        return res.status(200).json({
            status: "SUCCESS",
            message: "Notifications deleted successfully"
        });

    } catch (error) {

        return res.status(500).json({
            status: "FAILED",
            message: "Internal server error"
        });

    }

};

const markMultipleAsRead = async (req, res) => {
    const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                status: "FAILED",
                message: "Notification id is required"
            });
        }
    try {

        const [updatedCount] = await NotificationModel.update(
            { isRead: true },
            {
                where: {
                    id: {
                        [Op.in]: ids
                    }
                }
            }
        );

        return res.status(200).json({
            status: "SUCCESS",
            message: "Notifications marked as read",
            data: {
                updated: updatedCount
            }
        });

    } catch (error) {

        return res.status(500).json({
            status: "FAILED",
            message: "Internal server error"
        });

    }
};
module.exports = {
    createNotification,
    getAllNotifications,
    getUnreadCount,
    deleteMultipleNotifications,
    markMultipleAsRead
};