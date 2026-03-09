const Sequelize = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
    host: process.env.DB_HOST,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB,
    dialect: 'mysql',
    pool: {
        max: 30,
        min: 0,
        acquire: 60000,
        idle: 10000 
    }
});

// 🟢 Pool monitoring
function monitorPool(sequelize) {
    if (!sequelize.connectionManager.pool) {
        console.warn("⚠️ Sequelize pool not initialized yet.");
        return;
    }

    const pool = sequelize.connectionManager.pool;

    setInterval(() => {
        try {
            const used = pool.borrowed || pool._count?.borrowed || 0;
            const free = pool.available || pool._count?.available || 0;
            const pending = pool.pending || pool._count?.pending || 0;
            const size = pool.size || (used + free);

            console.log(
                `[POOL STATS] used: ${used}, free: ${free}, pending: ${pending}, size: ${size}`
            );
        } catch (err) {
            console.error("Error reading pool stats:", err.message);
        }
    }, 10000); // log every 10 seconds
}

monitorPool(sequelize);

module.exports = sequelize;
