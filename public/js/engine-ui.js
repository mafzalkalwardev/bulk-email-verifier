/**
 * Shared engine branding — used across all app pages.
 * Primary: truemail-go (SMTP + MX + full server responses)
 * Helper: AfterShip email-verifier (disposable / role / free lists only)
 */
const ENGINE_STACK = {
    primary: {
        id: 'truemail-go',
        name: 'truemail-go',
        role: 'Primary verifier',
        description: 'Syntax, MX lookup, and live SMTP RCPT dialog (port 25). Returns real server codes like 550 mailbox not found.',
        used: true,
        best: true,
    },
    misc: {
        id: 'aftership',
        name: 'AfterShip email-verifier',
        role: 'Misc flags only',
        description: 'Disposable domains, role accounts (info@), and free providers. Does not run SMTP in this app.',
        used: true,
        best: false,
    },
    notUsed: [
        { name: 'AfterShip (standalone)', reason: 'No SMTP dialog text in API — replaced by truemail-go' },
        { name: 'validate_email (Python)', reason: 'No full SMTP conversation' },
        { name: 'Reacher (Rust)', reason: 'Best accuracy but needs Rust/Docker — too heavy for npm start' },
        { name: 'KnowEmail (.exe)', reason: 'Desktop GUI only — not an API' },
        { name: 'Paid APIs (Hunter, etc.)', reason: 'Excluded — self-hosted only' },
    ],
};

const ENGINE_BADGE_LABEL = 'truemail-go';

function applyEngineBadges() {
    document.querySelectorAll('[data-engine-badge]').forEach(el => {
        el.textContent = ENGINE_BADGE_LABEL;
    });
}

function formatEngineStatus(health) {
    if (!health?.go) {
        return { online: false, text: 'Verifier offline — run npm start' };
    }
    const engine = health.engine || 'truemail-go';
    const port = health.smtp_port != null ? ` · SMTP port ${health.smtp_port}` : '';
    return {
        online: true,
        text: `Online — ${engine}${port}`,
        detail: health.engine,
    };
}

document.addEventListener('DOMContentLoaded', applyEngineBadges);
