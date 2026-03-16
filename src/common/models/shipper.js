const {DataTypes} = require('sequelize')
const sequelize = require('../../config/database')

const shipperModel = sequelize.define('Shipper', {
    id: {
  type: DataTypes.UUID,
  defaultValue: DataTypes.UUIDV4,
  primaryKey: true,
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
    businessName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    registrationNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    country: {
        type: DataTypes.STRING,
        allowNull: false
    },
    state: {
        type: DataTypes.STRING,
        allowNull: false
    },
    city: {
        type: DataTypes.STRING,
        allowNull: false
    },
    businessAddress: {
        type: DataTypes.STRING,
        allowNull: false
    },
    postalCode: {
        type: DataTypes.STRING,
        allowNull: false
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
    websiteURL: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Company website URL optional'
    },
    companyLogo: {
        type: DataTypes.STRING,
        allowNull: true
    },
    industry: {
        type: DataTypes.STRING,
        allowNull: true
    },
    registrationCertificatePDF: {
        type: DataTypes.STRING,
        allowNull: true
    },
    taxRegistrationPDF: {
        type: DataTypes.STRING,
        allowNull: true
    },
    businessLicensePDF: {
        type: DataTypes.STRING,
        allowNull: true
    },
    proofOfBusinessAddressPDF: {
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