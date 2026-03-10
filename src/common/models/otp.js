const {DataTypes} = require('sequelize')
const sequelize = require('../../config/database')

const OtpModel = sequelize.define('Otp', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    number: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    otp: {
        type: DataTypes.STRING,
        allowNull: false
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
}, {
    tableName: 'otp',
    timestamps: true
})

module.exports = OtpModel