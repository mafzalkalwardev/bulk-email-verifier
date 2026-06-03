/**
 * Persists bulk verification in sessionStorage — resume after leaving the page.
 */
const BULK_JOB_KEY = 'bulkVerifyJob';

function saveBulkJob(job) {
    try {
        sessionStorage.setItem(BULK_JOB_KEY, JSON.stringify(job));
    } catch (e) {
        console.warn('Could not save bulk job', e);
    }
}

function loadBulkJob() {
    try {
        const raw = sessionStorage.getItem(BULK_JOB_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (_) {
        return null;
    }
}

function clearBulkJob() {
    sessionStorage.removeItem(BULK_JOB_KEY);
}

function isBulkJobRunning() {
    const job = loadBulkJob();
    return job && job.status === 'running';
}

function guardNavigationWhileRunning() {
    window.addEventListener('beforeunload', e => {
        if (isBulkJobRunning()) {
            e.preventDefault();
            e.returnValue = 'Bulk verification in progress.';
        }
    });

    document.querySelectorAll('.sidebar a.nav-link').forEach(link => {
        link.addEventListener('click', e => {
            if (!isBulkJobRunning()) return;
            const href = link.getAttribute('href');
            if (!href || href.includes('bulk.html') || link.classList.contains('active')) return;
            const ok = confirm(
                'Bulk verification is still running.\n\nLeave this page? Open Bulk Verify again to resume where you left off.'
            );
            if (!ok) e.preventDefault();
        });
    });
}

window.BulkJob = { saveBulkJob, loadBulkJob, clearBulkJob, isBulkJobRunning, guardNavigationWhileRunning };
