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
const { resolveAccess } = require('./lib/indus_license');
const { licensePublicView, freeBulkDailyLimit } = require('./lib/license_mode');

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

app.get('/api/license', (_req, res) => {
    res.json(licensePublicView(app.locals.license));
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/verify', require('./routes/verifyRoutes'));
app.use('/api/history', require('./routes/historyRoutes'));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
    const access = await resolveAccess(__dirname);
    app.locals.license = access;
    if (access.mode === 'licensed') {
        console.log('🔑 Licensed mode: no daily bulk cap.');
    } else {
        console.log(
            `🆓 Free mode: ${freeBulkDailyLimit()} bulk addresses per account per UTC day. Single checks are not capped.`
        );
        if (access.message) console.warn(`License not applied (${access.reason}): ${access.message}`);
    }
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
