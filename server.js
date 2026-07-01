const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const connectDB = require('./config/db');
const { errorHandler } = require('./middlewares/errorMiddleware');
const { ensureGoVerifier, stopGoVerifier } = require('./utils/spawnGo');
const { resetEngineCache } = require('./utils/verificationEngine');

dotenv.config();
const { requireIndusLicense } = require('./lib/indus_license');

const app = express();

app.use(
    helmet({
        contentSecurityPolicy: false,
    })
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/verify', require('./routes/verifyRoutes'));
app.use('/api/history', require('./routes/historyRoutes'));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
    await requireIndusLicense(__dirname);
    resetEngineCache();
    console.log('📦 Connecting to database...');
    await connectDB();

    console.log('🔧 Starting truemail-go verifier (required)...');
    await ensureGoVerifier();

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Open http://localhost:${PORT}`);
    });
}

start().catch(err => {
    console.error('❌ Failed to start:', err.message);
    process.exit(1);
});

process.on('SIGINT', () => {
    stopGoVerifier();
    process.exit(0);
});
