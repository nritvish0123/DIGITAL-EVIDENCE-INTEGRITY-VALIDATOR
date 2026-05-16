// Shared Auth Check
if (!sessionStorage.getItem('userEmail')) {
    window.location.href = 'index.html';
}

// Additional page-specific initialization can go here
document.addEventListener('DOMContentLoaded', async () => {
    const userEmail = sessionStorage.getItem('userEmail');
    
    // Auto-fill email
    const userEmailField = document.getElementById('userEmail');
    if (userEmailField && userEmail) {
        userEmailField.value = userEmail;
    }

    // Fetch full profile if on account-settings page
    if (window.location.pathname.includes('account-settings.html') && userEmail) {
        const res = await apiCall(`/user-profile/${userEmail}`);
        if (res.success && res.data) {
            const profile = res.data;
            if (document.getElementById('userName')) document.getElementById('userName').value = profile.name || '';
            if (document.getElementById('userPhone')) document.getElementById('userPhone').value = profile.phone || '';
            if (document.getElementById('userDob')) document.getElementById('userDob').value = profile.dob || '';
            if (document.getElementById('userGender')) document.getElementById('userGender').value = profile.gender || '';
        }
    }
});
