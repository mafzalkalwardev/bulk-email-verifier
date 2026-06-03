const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod = null;
let dbReady = false;

const connectDB = async () => {
    if (process.env.MONGO_URI) {
        try {
            const conn = await mongoose.connect(process.env.MONGO_URI, {
                serverSelectionTimeoutMS: 8000,
            });
            dbReady = true;
            console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
            return;
        } catch (error) {
            console.warn(`⚠️  MongoDB URI failed (${error.message}) — using in-memory DB`);
        }
    }

    try {
        mongod = await MongoMemoryServer.create({
            instance: { ip: '127.0.0.1' },
        });
        const uri = mongod.getUri();
        const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
        dbReady = true;
        console.log(`✅ In-Memory MongoDB ready at ${uri}`);
        console.log('ℹ️  Data resets when you stop the server (no MONGO_URI set).');
    } catch (fallbackError) {
        console.error(`❌ MongoDB failed: ${fallbackError.message}`);
        throw fallbackError;
    }
};

function isDbReady() {
    return dbReady && mongoose.connection.readyState === 1;
}

process.on('SIGINT', async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
    process.exit(0);
});

module.exports = connectDB;
module.exports.isDbReady = isDbReady;
