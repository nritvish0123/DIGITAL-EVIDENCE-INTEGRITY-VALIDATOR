
const API_URL = (window.location.hostname === 'localhost' && window.location.port !== '3000') 
    ? 'http://localhost:3000/api' 
    : '/api';

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    if (body) options.body = JSON.stringify(body);

    try {
        console.log(`API [${method}] ${endpoint}`, body);
        const response = await fetch(`${API_URL}${endpoint}`, options);
        
        const text = await response.text();
        let data = null;
        
        try {
            data = text ? JSON.parse(text) : null;
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError, 'Raw response:', text);
            return { success: false, error: 'Server returned an invalid format' };
        }

        if (!response.ok) {
            console.warn(`API Error [${response.status}]:`, data);
        }

        return { success: response.ok, data };
    } catch (error) {
        console.error('Network/API Error:', error);
        let errorMsg = 'Connection error: Cannot reach server. Please ensure backend is running.';
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            errorMsg = 'Cannot connect to server. Is it running on http://localhost:3000?';
        }
        return { success: false, error: errorMsg };
    }
}

function logout(reason = 'User initiated') {
    const email = sessionStorage.getItem('userEmail');
    if (email) {
        apiCall('/logout', 'POST', { email });
        sessionStorage.removeItem('userEmail');
        sessionStorage.removeItem('adminAuth');
        sessionStorage.removeItem('requestId');
    }
    window.location.href = 'index.html';
}
