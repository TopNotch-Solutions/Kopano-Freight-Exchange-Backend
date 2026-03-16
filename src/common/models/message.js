const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const MessageModel = sequelize.define(
  'Message',
  {
    id: {
      type: DataTypes.UUID,
  defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    senderRole: {
      type: DataTypes.ENUM('carrier', 'shipper'),
      allowNull: false,
    },
    receiverId: {
      type: DataTypes.UUID,
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
      type: DataTypes.UUID,
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
