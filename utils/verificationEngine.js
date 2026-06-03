const axios = require('axios');
const { verifyWithReacher, checkReacherHealth, REACHER_BASE } = require('./reacherClient');

const GO_BASE = process.env.GO_VERIFIER_URL || 'http://localhost:8080';
const ENGINE_MODE = (process.env.VERIFIER_ENGINE || 'auto').toLowerCase();
const REACHER_TIMEOUT = parseInt(process.env.REACHER_TIMEOUT_MS || '60000', 10);

let cachedEngine = null;

async function verifyWithGo(email) {
    const url = `${GO_BASE}/v1/${encodeURIComponent(email)}/verification`;
    const { data } = await axios.get(url, { timeout: 120000 });
    if (data.engine !== undefined) return data;
    return { ...data, engine: 'truemail-go' };
}

function mapStatus(report) {
    if (report.valid) return 'valid';
    if (report.misc?.disposable) return 'disposable';
    if (report.mailbox_verified === 'no_smtp') return 'no_smtp';
    if (!report.domain_valid) return 'invalid';
    return 'invalid';
}

function wrapResult(report, email) {
    return {
        email: report.email || email,
        domain_valid: report.domain_valid,
        mailbox_verified: report.mailbox_verified,
        valid: report.valid,
        checks: report.checks || [],
        mx_records: report.mx_records || [],
        misc: report.misc || {},
        smtp_host: report.smtp_host || '',
        smtp_response: report.smtp_response || '',
        verdict_summary: report.verdict_summary || '',
        syntax_valid: report.syntax_valid,
        smtp_check_ran: report.smtp_check_ran,
        engine: report.engine || 'unknown',
        status: mapStatus(report),
        report,
    };
}

async function isTruemailUp() {
    try {
        const { data } = await axios.get(`${GO_BASE}/health`, { timeout: 3000 });
        return data?.status === 'ok';
    } catch (_) {
        return false;
    }
}

async function resolveEngine() {
    if (ENGINE_MODE === 'truemail') return 'truemail-go';
    if (ENGINE_MODE === 'reacher') {
        if (await checkReacherHealth()) return 'reacher';
        if (await isTruemailUp()) {
            console.warn('⚠️  Reacher down — using truemail-go');
            return 'truemail-go';
        }
        throw new Error('Reacher not running. Run: docker compose up -d');
    }

    if (cachedEngine) return cachedEngine;

    // auto: truemail-go first (fast SMTP; Reacher can hang 2+ min on Gmail)
    if (await isTruemailUp()) {
        cachedEngine = 'truemail-go';
        console.log('✅ Using truemail-go engine at', GO_BASE);
        return cachedEngine;
    }

    if (await checkReacherHealth()) {
        cachedEngine = 'reacher';
        console.log('✅ Using Reacher engine at', REACHER_BASE);
        return cachedEngine;
    }

    throw new Error('No verifier available. Run: npm start  (and optionally docker compose up -d)');
}

async function verifyWithReacherTimed(email) {
    const proxy = process.env.SMTP_PROXY;
    const body = { to_email: email, hello_name: 'reacher.app' };
    if (proxy) {
        try {
            const u = new URL(proxy);
            body.proxy = {
                host: u.hostname,
                port: parseInt(u.port || '1080', 10),
                username: u.username || undefined,
                password: u.password || undefined,
            };
        } catch (_) {}
    }

    const { data } = await axios.post(`${REACHER_BASE}/v0/check_email`, body, {
        timeout: REACHER_TIMEOUT,
    });
    const { mapReacherToReport } = require('./reacherClient');
    return mapReacherToReport(data, email);
}

async function verifyEmailCombined(email) {
    const engine = await resolveEngine();
    let report;

    try {
        if (engine === 'reacher') {
            report = await verifyWithReacherTimed(email);
        } else {
            report = await verifyWithGo(email);
        }
    } catch (primaryErr) {
        const isTimeout =
            primaryErr.code === 'ECONNABORTED' ||
            String(primaryErr.message).includes('timeout');

        if (engine === 'reacher' && (isTimeout || primaryErr.message) && (await isTruemailUp())) {
            console.warn(`Reacher slow/failed for ${email}, falling back to truemail-go`);
            report = await verifyWithGo(email);
            report.engine = 'truemail-go';
            report.fallback_from = 'reacher';
        } else {
            throw new Error(
                engine === 'reacher'
                    ? `Reacher failed: ${primaryErr.message}`
                    : `truemail-go failed: ${primaryErr.message}`
            );
        }
    }

    return wrapResult(report, email);
}

async function checkBackendHealth() {
    const health = {
        go: false,
        reacher: false,
        engine: null,
        active_engine: null,
        smtp_port: null,
        go_url: GO_BASE,
        reacher_url: REACHER_BASE,
        mode: ENGINE_MODE,
    };

    try {
        const { data } = await axios.get(`${GO_BASE}/health`, { timeout: 5000 });
        health.go = data?.status === 'ok';
        health.smtp_port = data?.smtp_port || null;
        if (health.go) health.engine = data?.engine || 'truemail-go';
    } catch (_) {}

    health.reacher = await checkReacherHealth();

    try {
        health.active_engine = await resolveEngine();
    } catch (_) {
        health.active_engine = null;
    }

    return health;
}

function resetEngineCache() {
    cachedEngine = null;
}

module.exports = {
    verifyEmailCombined,
    checkBackendHealth,
    verifyWithGo,
    GO_BASE,
    mapStatus,
    resolveEngine,
    resetEngineCache,
};
