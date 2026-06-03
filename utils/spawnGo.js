const { spawn } = require('child_process');
const path = require('path');
const axios = require('axios');

const GO_BASE = process.env.GO_VERIFIER_URL || 'http://localhost:8080';
const ENGINE_MODE = (process.env.VERIFIER_ENGINE || 'auto').toLowerCase();

let goProcess = null;

function isLocalGoUrl() {
    try {
        const url = new URL(GO_BASE);
        return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    } catch {
        return false;
    }
}

function goPortFromEnv() {
    try {
        const url = new URL(GO_BASE);
        return url.port || '8080';
    } catch {
        return '8080';
    }
}

async function isGoHealthy() {
    try {
        const { data } = await axios.get(`${GO_BASE}/health`, { timeout: 3000 });
        return data?.status === 'ok' && String(data?.engine || '').includes('truemail');
    } catch {
        return false;
    }
}

async function ensureGoVerifier() {
    if (ENGINE_MODE === 'reacher') {
        console.log('ℹ️  VERIFIER_ENGINE=reacher — skipping Go auto-start');
        return;
    }

    if (!isLocalGoUrl()) {
        return;
    }

    if (await isGoHealthy()) {
        console.log('✅ truemail-go verifier already running at', GO_BASE);
        return;
    }

    const goDir = path.join(__dirname, '..', 'backend', 'go');
    const port = goPortFromEnv();
    console.log(`🚀 Starting truemail-go on port ${port}...`);

    goProcess = spawn('go', ['run', 'main.go'], {
        cwd: goDir,
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, VERIFIER_GO_PORT: port },
    });

    goProcess.on('error', err => {
        console.error('❌ Failed to start Go verifier:', err.message);
    });

    for (let i = 0; i < 25; i++) {
        await new Promise(r => setTimeout(r, 1000));
        if (await isGoHealthy()) {
            console.log('✅ truemail-go ready at', GO_BASE);
            return;
        }
    }

    console.warn('⚠️  truemail-go did not respond — try: docker compose up -d (Reacher)');
}

function stopGoVerifier() {
    if (goProcess) {
        goProcess.kill();
        goProcess = null;
    }
}

module.exports = { ensureGoVerifier, stopGoVerifier };
