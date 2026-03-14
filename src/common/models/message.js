const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const MessageModel = sequelize.define(
  'Message',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    senderRole: {
      type: DataTypes.ENUM('carrier', 'shipper'),
      allowNull: false,
    },
    receiverId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    receiverRole: {
      type: DataTypes.ENUM('carrier', 'shipper'),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    conversationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Load ID when channel was created; one conversation per accepted load',
    },
  },
  {
    tableName: 'messages',
    timestamps: true,
    indexes: [
      { fields: ['senderId'] },
      { fields: ['receiverId'] },
      { fields: ['createdAt'] },
      { fields: ['conversationId'] },
    ],
  }
);

module.exports = MessageModel;
