function isValidStatus(status, details) {
    const s = String(status || '').toLowerCase();
    if (s === 'valid' || s === 'ok') return true;
    if (details?.report?.valid === true) return true;
    return false;
}

function isUnknownStatus(status) {
    const s = String(status || '').toLowerCase();
    return s === 'unknown' || s === 'no_smtp';
}

function classifyHistoryRecord(record) {
    if (isValidStatus(record.status, record.details)) return 'valid';
    if (isUnknownStatus(record.status)) return 'unknown';
    return 'invalid';
}

function statusBadgeClass(status, details) {
    if (isValidStatus(status, details)) return 'bg-success';
    const s = String(status || '').toLowerCase();
    if (s === 'fail' || s === 'error' || s === 'invalid') return 'bg-danger';
    if (s === 'disposable' || s === 'catch_all') return 'bg-warning text-dark';
    if (isUnknownStatus(s)) return 'bg-secondary';
    return 'bg-danger';
}

function statusLabel(status, details) {
    if (isValidStatus(status, details)) return 'VALID';
    return String(status || 'unknown').toUpperCase();
}

module.exports = {
    isValidStatus,
    isUnknownStatus,
    classifyHistoryRecord,
    statusBadgeClass,
    statusLabel,
};
