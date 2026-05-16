const loginForm = document.getElementById('loginForm');
const loginCard = document.getElementById('loginCard');
const waitingCard = document.getElementById('waitingCard');
const timerEl = document.getElementById('timer');
const errorEl = document.getElementById('error');

let checkInterval;
let countdownInterval;

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const btn = document.getElementById('loginBtn');

        btn.disabled = true;
        btn.textContent = 'Requesting...';

        const res = await apiCall('/login-request', 'POST', { email, password });

        if (res.success && res.data.success) {
            loginCard.classList.add('hidden');
            waitingCard.classList.remove('hidden');
            startPolling(res.data.requestId, email);
        } else {
            errorEl.textContent = (res.data && res.data.message) || res.error || 'Connection error';
            btn.disabled = false;
            btn.textContent = 'Login Request';
        }
    });
}

function startPolling(requestId, email) {
    let timeLeft = 120; 

    countdownInterval = setInterval(() => {
        const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const s = (timeLeft % 60).toString().padStart(2, '0');
        if (timerEl) timerEl.textContent = `${m}:${s}`;
        
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            clearInterval(checkInterval);
            alert('Login request expired. Please try again.');
            window.location.reload();
        }
        timeLeft--;
    }, 1000);

    checkInterval = setInterval(async () => {
        const res = await apiCall(`/check-status/${requestId}`);
        
        if (res.data.status === 'approved') {
            clearInterval(checkInterval);
            clearInterval(countdownInterval);
            sessionStorage.setItem('userEmail', email);
            sessionStorage.setItem('requestId', requestId);
            
            showToast('Login Approved!', 'success');
            window.location.href = 'dashboard.html';
        } else if (res.data.status === 'expired') {
            clearInterval(checkInterval);
            clearInterval(countdownInterval);
            window.location.reload();
        }
    }, 3000); 
}
