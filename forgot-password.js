const forgotForm = document.getElementById('forgotForm');
if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const btn = e.target.querySelector('button');
        const msg = document.getElementById('msg');

        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Sending...';
        }
        if (msg) msg.textContent = '';

        const res = await apiCall('/forgot-password', 'POST', { email });

        if (res.success && res.data.success) {
            if (msg) {
                msg.style.color = '#10b981';
                msg.textContent = res.data.message;
            }
            if (btn) btn.textContent = 'Sent!';
        } else {
            if (msg) {
                msg.style.color = '#ef4444';
                msg.textContent = (res.data && res.data.message) || res.error || 'Connection error';
            }
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Send Recovery Email';
            }
        }
    });
}
