// Axios default configuration — attach JWT to every request
axios.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Global 401 handler — if token is stale/invalid, auto-logout and redirect
axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            const path = window.location.pathname;
            if (path !== '/' && path !== '/index.html') {
                // Token is invalid — clear and redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/?expired=1';
            }
        }
        return Promise.reject(error);
    }
);

// Check auth status on page load
function checkAuth() {
    const token = localStorage.getItem('token');
    const path  = window.location.pathname;

    if (!token && path !== '/' && path !== '/index.html') {
        window.location.href = '/';
    } else if (token && (path === '/' || path === '/index.html' || path === '')) {
        window.location.href = '/dashboard.html';
    }
}

// Show a session-expired message on login page if redirected
function checkExpiredSession() {
    if (window.location.search.includes('expired=1')) {
        setTimeout(() => {
            showToast('Session expired — please log in again.', 'error');
        }, 300);
    }
}

// Theme toggle
function initTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// Toast notification helper
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const bgClass = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-info';

    const toastHtml = `
        <div class="toast align-items-center text-white ${bgClass} border-0 mb-2" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastEl = toastContainer.lastElementChild;
    const toast   = new bootstrap.Toast(toastEl, { delay: 3500 });
    toast.show();

    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    checkExpiredSession();
    initTheme();

    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', e => { e.preventDefault(); logout(); });

    // Display user name in sidebar
    const userNameEl = document.getElementById('userNameDisplay');
    if (userNameEl) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        userNameEl.textContent = user.name || 'User';
    }
});
