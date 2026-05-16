const btn = document.getElementById('submitBtn');

const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const dob = document.getElementById('dob').value;
        const gender = document.getElementById('gender').value;

        if (btn) {
            btn.textContent = 'Registering...';
            btn.disabled = true;
        }

        const res = await apiCall('/register', 'POST', { 
            name, phone, email, password, dob, gender 
        });

        if (res.success && res.data.success) {
            showToast('Registration successful! Please login.', 'success');
            setTimeout(() => window.location.href = 'index.html', 1500);
        } else {
            const errorEl = document.getElementById('error');
            if (errorEl) errorEl.textContent = (res.data && res.data.message) || res.error || 'Connection error';
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Register';
            }
        }
    });
}
