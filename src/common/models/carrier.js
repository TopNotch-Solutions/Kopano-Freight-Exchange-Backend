const {DataTypes} = require('sequelize')
const sequelize = require('../../config/database')
const { tr } = require('date-fns/locale')

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
    nationalID: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
        dateOfBirth: {
        type: DataTypes.DATE,
        allowNull: false
    },
    residentailAddress: {
        type: DataTypes.STRING,
        allowNull: false
    },
    licenseNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
     licenseExpiryDate: {
        type: DataTypes.DATE,
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
    vehicleRegistrationNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
     VINNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    truckType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    trailerType: {
        type: DataTypes.STRING,
        allowNull: true
    },
    loadCapacity: {
        type: DataTypes.DECIMAL(10, 2),
            allowNull: false
    },
    vehicleRegistractionCertificate: {
         type: DataTypes.STRING,
        allowNull: true
    },
    roadWorthinessCertificate: {
        type: DataTypes.STRING,
        allowNull: true
    },
    operatingPermit: {
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