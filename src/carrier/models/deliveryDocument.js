const {DataTypes} = require('sequelize')
const sequelize = require('../../config/database')
const loadModel = require('../../shipper/models/load')

const deliveryDocumentModel = sequelize.define('DeliveryDocument', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    loadId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: loadModel,
        key: "id",
      },
    },
    deliveryPhoto: {
        type: DataTypes.STRING,
        allowNull: false
    },
     signOff: {
        type: DataTypes.STRING,
        allowNull: true
    },
}, {
    tableName: 'delivery_documents',
    timestamps: true
})

module.exports = deliveryDocumentModel