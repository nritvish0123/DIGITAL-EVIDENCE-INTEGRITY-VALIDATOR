if (!sessionStorage.getItem('adminAuth')) {
    window.location.href = 'admin-login.html';
}

const MODEL_URL = '/models';
let adminFaceDescriptor = null;
let modelsLoaded = false;

const adminEmail = sessionStorage.getItem('userEmail') || 'admin@validator.com';

async function loadUserProfile() {
    const res = await apiCall(`/user-profile/${adminEmail}`);
    if (res.success && res.data) {
        const profile = res.data;
        document.getElementById('display-name').textContent = profile.name;
        document.getElementById('display-status').textContent = 'System Administrator';
        
        document.getElementById('info-name').textContent = profile.name;
        document.getElementById('info-dob').textContent = profile.dob || 'Not Set';
        document.getElementById('info-gender').textContent = profile.gender || 'Not Set';
        document.getElementById('info-email').textContent = profile.email;
        document.getElementById('info-phone').textContent = profile.phone;
    } else {
        // Fallback for default admin
        document.getElementById('display-name').textContent = 'Administrator';
        document.getElementById('display-status').textContent = 'System Administrator';
    }
}

document.addEventListener('DOMContentLoaded', loadUserProfile);

async function loadData() {
    const res = await apiCall('/admin-data');
    if (!res.success || !res.data) {
        console.error('Failed to load admin data:', res.error);
        return;
    }
    
    const { users, logs, requests } = res.data;

    const usersHtml = users.map(u => `
        <tr>
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td>${u.phone}</td>
            <td>${new Date(u.registeredAt).toLocaleString()}</td>
            <td>
                <button onclick="forceLogout('${u.email}')" class="btn" style="padding: 0.4rem; font-size: 0.75rem; background: #ef4444; width: auto;">Force Logout</button>
            </td>
        </tr>
    `).join('');
    const usersTable = document.getElementById('usersTable');
    if (usersTable) usersTable.innerHTML = usersHtml;

    const logsHtml = logs.slice().reverse().map(l => {
        let badgeClass = 'badge-pending';
        if(l.type.includes('SUSPICIOUS')) badgeClass = 'badge-suspicious';
        else if(l.type === 'LOGIN') badgeClass = 'badge-approved';
        
        return `
        <tr>
            <td>${l.email}</td>
            <td><span class="badge ${badgeClass}">${l.type}</span></td>
            <td>${new Date(l.timestamp).toLocaleString()}</td>
        </tr>
    `}).join('');
    const logsTable = document.getElementById('logsTable');
    if (logsTable) logsTable.innerHTML = logsHtml;

    const pendingHtml = requests.slice().reverse().map(r => {
        const isPending = r.status === 'pending';

        const expired = (Date.now() - r.timestamp) > 120000;
        let status = r.status;
        if (expired && status === 'pending') status = 'expired (timeout)';

        let action = '-';
        if (status === 'pending') {
            action = `<button onclick="approve('${r.requestId}')" class="btn" style="padding: 0.5rem; font-size: 0.8rem;">Approve</button>`;
        } else if (status === 'approved') {
            action = `
                <div style="display: flex; gap: 0.5rem; white-space: nowrap;">
                    <button onclick="revokeLogin('${r.requestId}')" class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background: #f59e0b; width: auto;">Revoke</button>
                    <button onclick="revokeAndLogout('${r.requestId}', '${r.email}', 'login')" class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background: #ef4444; width: auto;">Revoke & Logout</button>
                </div>
            `;
        }

        let badge = status === 'approved' ? 'badge-approved' : (status === 'pending' ? 'badge-pending' : 'badge-expired');

        return `
        <tr>
            <td>${r.email}</td>
            <td>${new Date(r.timestamp).toLocaleTimeString()}</td>
            <td><span class="badge ${badge}">${status}</span></td>
            <td>${action}</td>
        </tr>
    `}).join('');
    const pendingTable = document.getElementById('pendingTable');
    if (pendingTable) pendingTable.innerHTML = pendingHtml;

}


async function forceLogout(email) {
    if(!confirm(`Force logout user ${email}?`)) return;
    
    const res = await apiCall('/force-logout', 'POST', { email });
    if (res.success) {
        showToast(`Forced logout for ${email}`, 'success');
        loadData();
    } else {
        showToast('Error sending force logout', 'error');
    }
}

async function revokeLogin(requestId) {
    if(!confirm("Revoke this login approval?")) return;
    const res = await apiCall('/revoke-login-approval', 'POST', { requestId });
    if (res.success) {
        showToast('Login approval revoked', 'info');
        loadData();
    } else {
        showToast('Error revoking approval', 'error');
    }
}


async function revokeAndLogout(requestId, email, type) {
    const action = type === 'login' ? 'Login' : 'Modification';
    if(!confirm(`CRITICAL: Revoke ${action} and force logout user ${email}?`)) return;

    const res = await apiCall('/revoke-and-logout', 'POST', { requestId, email, type });
    if (res.success) {
        showToast('Approval revoked and user flagged for logout', 'success');
        loadData();
    } else {
        showToast('Error processing revocation', 'error');
    }
}

async function showBiometricUI() {
    return new Promise(async (resolve) => {
        const overlay = document.createElement('div');
        overlay.style = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
            display: flex; justify-content: center; align-items: center; z-index: 9999;
        `;
        
        const modal = document.createElement('div');
        modal.className = 'card';
        modal.style = 'max-width: 400px; text-align: center; border: 2px solid #6366f1;';
        modal.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 1rem;">👤</div>
            <h2 style="margin-bottom: 1rem;">Admin Face Verification</h2>
            <p style="margin-bottom: 1.5rem; font-size: 0.9rem;">Look into the camera to authorize this modification.</p>
            
            <div style="position: relative; display: flex; justify-content: center; margin-bottom: 1.5rem;">
                <video id="adminBioVideo" autoplay muted playsinline webkit-playsinline style="width: 100%; max-width: 280px; border-radius: 8px; transform: scaleX(-1); border: 2px solid rgba(255,255,255,0.1);"></video>
            </div>

            <div id="bioStatus" style="color: #818cf8; font-weight: bold; margin-bottom: 1.5rem; font-size: 0.9rem;">Initializing...</div>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button id="cancelBio" class="btn btn-secondary" style="width: auto; padding: 0.5rem 1.5rem;">Cancel</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const statusEl = modal.querySelector('#bioStatus');
        const video = modal.querySelector('#adminBioVideo');
        let stream = null;
        let isActive = true;

        const cleanup = () => {
            isActive = false;
            if (stream) stream.getTracks().forEach(track => track.stop());
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
        };

        try {
            if (typeof faceapi === 'undefined') {
                throw new Error('Face recognition engine is still loading. Please wait a moment and try again.');
            }

            if (!modelsLoaded) {
                statusEl.textContent = 'Loading AI Models...';
                // Load models sequentially for better diagnostics
                await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
                await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
                await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
                modelsLoaded = true;
            }

            if (!adminFaceDescriptor) {
                statusEl.textContent = 'Loading Reference Data...';
                const img = await faceapi.fetchImage('img/admin.face.jpg').catch(err => {
                    throw new Error('Reference image not found (img/admin.face.jpg)');
                });
                const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
                if (!detections) throw new Error('Could not extract features from reference image.');
                adminFaceDescriptor = detections.descriptor;
            }

            statusEl.textContent = 'Starting Camera...';
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } 
            }).catch(err => {
                throw new Error('Camera access failed: ' + err.message);
            });
            
            video.srcObject = stream;
            // Explicitly call play for better compatibility
            try {
                await video.play();
                console.log('Video stream started successfully');
            } catch (playErr) {
                console.error('Error starting video playback:', playErr);
            }

            const detect = async () => {
                if (!isActive) return;
                
                try {
                    const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
                    if (detection && adminFaceDescriptor) {
                        const distance = faceapi.euclideanDistance(adminFaceDescriptor, detection.descriptor);
                        console.log('Face Match Distance (Auth):', distance.toFixed(4));
    
                        if (distance < 0.45) {
                            statusEl.textContent = 'Face Verified! Authorizing...';
                            statusEl.style.color = '#10b981';
                            setTimeout(() => {
                                cleanup();
                                resolve(true);
                            }, 1000);
                            return;
                        } else {
                            statusEl.textContent = `Scanning... (Match: ${(1 - distance).toFixed(2)})`;
                            statusEl.style.color = '#f59e0b';
                        }
                    } else {
                        statusEl.textContent = 'Scanning... No Face Detected';
                        statusEl.style.color = '#818cf8';
                    }
                } catch (err) {
                    console.error('Detection error:', err);
                }
                setTimeout(detect, 500);
            };

            video.onplay = () => detect();

        } catch (err) {
            console.error('Biometric UI Error:', err);
            statusEl.textContent = 'Error: ' + err.message;
            statusEl.style.color = '#ef4444';
        }

        modal.querySelector('#cancelBio').onclick = () => {
            cleanup();
            resolve(false);
        };
    });
}

async function approve(requestId) {
    const res = await apiCall('/approve-login', 'POST', { requestId });
    if (res.success) {
        showToast('Request Approved', 'success');
        loadData();
    } else {
        showToast(res.data.message || 'Error', 'error');
        loadData();
    }
}

async function downloadReport() {
    const res = await apiCall('/admin-data');
    if (!res.success || !res.data) {
        showToast('Failed to load data for report', 'error');
        return;
    }
    
    const logs = res.data.logs;
    if (logs.length === 0) {
        showToast('No logs available to download', 'info');
        return;
    }

    let csv = 'User Email,Activity Type,Timestamp\n';
    
    logs.forEach(log => {
        csv += `"${log.email}","${log.type}","${new Date(log.timestamp).toLocaleString()}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `activity_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

async function revokeAndLogoutAll() {
    if (!confirm("⚠️ CRITICAL ACTION: Are you sure you want to revoke ALL active and pending login approvals and logout all users? This cannot be undone.")) {
        return;
    }

    try {
        const res = await apiCall('/revoke-all-logout', 'POST');
        if (res.success) {
            showToast(res.message, 'success');
            loadData();
        } else {
            showToast(res.message || 'Error processing global logout', 'error');
        }
    } catch (error) {
        console.error('Global Logout UI Error:', error);
        showToast('Connection error during global logout', 'error');
    }
}

// Initial data load and event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadUserProfile();
    loadData();
    
    const globalLogoutBtn = document.getElementById('globalLogoutBtn');
    if (globalLogoutBtn) {
        globalLogoutBtn.addEventListener('click', revokeAndLogoutAll);
    }
});

setInterval(loadData, 3000);
