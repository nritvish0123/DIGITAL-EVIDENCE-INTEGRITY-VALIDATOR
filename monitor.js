let isSuspicious = false;

window.addEventListener('blur', () => {
    if (sessionStorage.getItem('userEmail')) {
       
    }
});

async function handleSuspiciousActivity(type) {
    if (isSuspicious) return; 
    isSuspicious = true;

    const email = sessionStorage.getItem('userEmail');
    if (!email) return;

    await apiCall('/suspicious', 'POST', { email, type });

    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('requestId');
    
    alert('Security Alert: Suspicious activity detected (' + type + '). You have been logged out.');
    window.location.href = 'index.html';
}

/**
 * Real-time Session Monitoring
 * Polls the server to check if the current login request has been revoked by an admin.
 */
function startSessionMonitoring() {
    const requestId = sessionStorage.getItem('requestId');
    if (!requestId) return;

    setInterval(async () => {
        const res = await apiCall(`/check-status/${requestId}`);
        if (res.success && res.data.status === 'rejected') {
            console.warn('Session Revoked by Admin');
            sessionStorage.clear();
            alert('Your session has been revoked by the administrator.');
            window.location.href = 'index.html';
        }
    }, 3000); // Check every 3 seconds
}

// Start monitoring if logged in
if (sessionStorage.getItem('userEmail')) {
    startSessionMonitoring();
}
