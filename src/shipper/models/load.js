const {DataTypes} = require('sequelize')
const sequelize = require('../../config/database')

const loadModel = sequelize.define('Load', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    shipperId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "shippers",
        key: "id",
      },
    },
    pickupLocation: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    dropoffLocation: {
        type: DataTypes.STRING,
        allowNull: false
    },
    weight: {
        type: DataTypes.STRING,
        allowNull: true
    },
    loadType: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('open', 'assigned', 'in_transit', 'delivered', 'cancelled'),
        allowNull: true,
        defaultValue: 'open',
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    instruction: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
     pickupTime: {
        type: DataTypes.DATE,
        allowNull: false
    },
    deadline: {
        type: DataTypes.DATE,
        defaultValue: false
    },
    image1: {
        type: DataTypes.STRING,
        allowNull: false
    },
    image2: {
        type: DataTypes.STRING,
        defaultValue: true
    },
    image3: {
        type: DataTypes.STRING,
        defaultValue: true
    }
}, {
    tableName: 'loads',
    timestamps: true
})

module.exports = loadModel