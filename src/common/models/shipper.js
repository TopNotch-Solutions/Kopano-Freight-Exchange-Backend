const {DataTypes} = require('sequelize')
const sequelize = require('../../config/database')

const shipperModel = sequelize.define('Shipper', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    businessName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    registrationNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    dateOfIncorporation: {
        type: DataTypes.DATE,
        allowNull: false
    },
    entity: {
        type: DataTypes.STRING,
        allowNull: true
    },
    cellPhoneNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true
    },
    companyLogo: {
        type: DataTypes.STRING,
        allowNull: true
    },
    industry: {
        type: DataTypes.STRING,
        allowNull: true
    },
    taxRegistrationPDF: {
        type: DataTypes.STRING,
        allowNull: true
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
        defaultValue: 'shipper'
    }
}, {
    tableName: 'shippers',
    timestamps: true
})

module.exports = shipperModel