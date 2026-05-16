if (!sessionStorage.getItem('userEmail')) {
    window.location.href = 'index.html';
}

const userEmail = sessionStorage.getItem('userEmail');
const changePasswordForm = document.getElementById('changePasswordForm');
const errorDiv = document.getElementById('passwordError');

if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const oldPassword = document.getElementById('oldPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const submitBtn = changePasswordForm.querySelector('button[type="submit"]');

        // Reset error
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';

        // Front-end validation
        if (newPassword !== confirmPassword) {
            errorDiv.textContent = 'New passwords do not match';
            errorDiv.style.display = 'block';
            return;
        }

        if (newPassword.length < 6) {
            errorDiv.textContent = 'New password must be at least 6 characters long';
            errorDiv.style.display = 'block';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';

        try {
            const res = await apiCall('/change-password', 'POST', {
                email: userEmail,
                oldPassword,
                newPassword,
                confirmPassword
            });

            if (res.success) {
                showToast('Password updated successfully!', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
            } else {
                errorDiv.textContent = res.data?.message || res.error || 'Error updating password';
                errorDiv.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Update Password';
            }
        } catch (error) {
            errorDiv.textContent = 'System error occurred';
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Update Password';
        }
    });
}
