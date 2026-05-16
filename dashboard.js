if (!sessionStorage.getItem('userEmail')) {
    window.location.href = 'index.html';
}

const userEmail = sessionStorage.getItem('userEmail');

async function loadUserProfile() {
    if (!userEmail) return;
    const res = await apiCall(`/user-profile/${userEmail}`);
    if (res.success && res.data) {
        const profile = res.data;
        document.getElementById('display-name').textContent = profile.name;
        document.getElementById('display-status').textContent = 'Active';
        
        document.getElementById('info-name').textContent = profile.name;
        document.getElementById('info-dob').textContent = profile.dob || 'Not Set';
        document.getElementById('info-gender').textContent = profile.gender || 'Not Set';
        document.getElementById('info-phone').textContent = profile.phone;
        document.getElementById('info-email').textContent = profile.email;
    }
}

document.addEventListener('DOMContentLoaded', loadUserProfile);

function showUploaded() {
    window.location.href = 'evidence-list.html';
}

