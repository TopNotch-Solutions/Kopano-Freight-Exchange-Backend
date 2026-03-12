const {DataTypes} = require('sequelize')
const sequelize = require('../../config/database')
const loadModel = require('../../shipper/models/load')

const loadAssignmentModel = sequelize.define('LoadAssignment', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    loadId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "loads",
        key: "id",
      },
    },
    carrierId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "carriers",
        key: "id",
      },
    },
     acceptedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
}, {
    tableName: 'load_assignments',
    timestamps: true
})

module.exports = loadAssignmentModel