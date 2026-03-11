const {DataTypes} = require('sequelize')
const sequelize = require('../../config/database')

const userModel = sequelize.define('Carrier', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    profileImage: {
        type: DataTypes.STRING,
        allowNull: true
    },
    drivingLicenseFront: {
        type: DataTypes.STRING,
        allowNull: true
    },
    drivingLicenseBack: {
        type: DataTypes.STRING,
        allowNull: true
    },
    diskImage: {
        type: DataTypes.STRING,
        allowNull: true
    },
    diskExpiryDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    vehicleFrontImage: {
        type: DataTypes.STRING,
        allowNull: true
    },
    vehicleBackImage: {
        type: DataTypes.STRING,
        allowNull: true
    },
    vehicleRearImage: {
        type: DataTypes.STRING,
        allowNull: true
    },
    cellPhoneNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
     VerifiedCellPhoneNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isAccountVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isCellphoneNumberVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'carrier'
    }
}, {
    tableName: 'carriers',
    timestamps: true
})

module.exports = userModel