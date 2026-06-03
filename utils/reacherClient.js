const axios = require('axios');

const REACHER_BASE = process.env.REACHER_URL || 'http://localhost:8081';

function isErrorBlock(obj) {
    return obj && typeof obj === 'object' && obj.type === 'error';
}

function mapReacherToReport(data, email) {
    const syntax = data.syntax || {};
    const mx = isErrorBlock(data.mx) ? {} : data.mx || {};
    const smtp = isErrorBlock(data.smtp) ? {} : data.smtp || {};
    const misc = isErrorBlock(data.misc) ? {} : data.misc || {};

    const syntaxValid = syntax.is_valid_syntax !== false;
    const mxRecords = (mx.records || []).map((host, i) => ({
        host: String(host).replace(/\.$/, ''),
        priority: (i + 1) * 10,
    }));

    const disposable = !!misc.is_disposable;
    const checks = [];

    checks.push({
        step: 'syntax',
        passed: syntaxValid,
        message: syntaxValid
            ? 'The Email Address Syntax is correct'
            : 'The Email Address Syntax is incorrect',
    });

    if (disposable) {
        checks.push({ step: 'misc', passed: false, message: 'Disposable / temporary email domain detected' });
    } else {
        checks.push({ step: 'misc', passed: true, message: 'Not a known disposable domain' });
    }
    if (misc.is_role_account) {
        checks.push({ step: 'misc', passed: false, message: 'Role-based email account' });
    }

    if (!mx.accepts_mail || mxRecords.length === 0) {
        checks.push({ step: 'mx', passed: false, message: 'No MX records found for domain' });
    } else {
        mxRecords.forEach(mx => {
            checks.push({
                step: 'mx',
                passed: true,
                message: `MX record found: ${mx.host} (Priority ${mx.priority})`,
            });
        });
    }

    const smtpRan = smtp.can_connect_smtp === true;
    const deliverable = smtp.is_deliverable === true;
    const reachable = data.is_reachable || 'unknown';

    if (smtpRan) {
        checks.push({
            step: 'smtp',
            passed: deliverable,
            message: deliverable ? 'SMTP mailbox confirmed (Reacher)' : 'SMTP mailbox not confirmed (Reacher)',
            detail: deliverable
                ? '250 OK / is_deliverable'
                : `is_reachable: ${reachable}`,
        });
    }

    const domainValid = syntaxValid && mx.accepts_mail && !disposable;

    let mailboxVerified = 'no_smtp';
    if (reachable === 'safe' || deliverable) {
        mailboxVerified = 'yes';
    } else if (reachable === 'invalid' && smtpRan) {
        mailboxVerified = 'no';
    } else if (smtpRan && !deliverable) {
        mailboxVerified = 'no';
    }

    const valid = mailboxVerified === 'yes';
    let verdictSummary = `${email} seems not to be valid`;
    if (valid) verdictSummary = `${email} seems to be valid`;
    else if (mailboxVerified === 'no_smtp' && domainValid) {
        verdictSummary = `${email} — domain OK but mailbox could not be verified (SMTP blocked or unknown)`;
    }

    return {
        email: data.input || email,
        domain_valid: domainValid,
        mailbox_verified: mailboxVerified,
        valid,
        checks,
        mx_records: mxRecords,
        misc: {
            disposable,
            role_account: !!misc.is_role_account,
            free_provider: false,
        },
        smtp_host: mxRecords[0]?.host || '',
        smtp_response: smtpRan
            ? `is_reachable=${reachable}, is_deliverable=${deliverable}`
            : '',
        verdict_summary: verdictSummary,
        syntax_valid: syntaxValid,
        smtp_check_ran: smtpRan,
        engine: 'reacher',
        reacher_raw: data,
    };
}

async function checkReacherHealth() {
    try {
        const { data } = await axios.get(`${REACHER_BASE}/version`, { timeout: 5000 });
        return !!data;
    } catch (_) {
        return false;
    }
}

async function verifyWithReacher(email) {
    const proxy = process.env.SMTP_PROXY;
    const body = {
        to_email: email,
        hello_name: 'reacher.app',
    };
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

    const timeout = parseInt(process.env.REACHER_TIMEOUT_MS || '45000', 10);
    const { data } = await axios.post(`${REACHER_BASE}/v0/check_email`, body, {
        timeout,
    });
    return mapReacherToReport(data, email);
}

module.exports = {
    verifyWithReacher,
    checkReacherHealth,
    REACHER_BASE,
    mapReacherToReport,
};
