const MODEL_URL = '/models'; 
let adminFaceDescriptor = null;

const adminForm = document.getElementById('adminForm');
if (adminForm) {
    adminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('adminId').value;
        const pass = document.getElementById('password').value;
        const errorDiv = document.getElementById('error');

        // Simple check for admin credentials before proceeding to biometrics
        if (id === 'admin' && pass === '630634') {
            document.getElementById('adminForm').style.display = 'none';
            document.getElementById('videoContainer').style.display = 'flex';
            startBiometricAuth();
        } else {
            if (errorDiv) {
                errorDiv.textContent = 'Invalid Admin Credentials';
                errorDiv.style.color = '#35179aff';
            }
        }
    });
}

async function startBiometricAuth() {
    const statusMsg = document.getElementById('statusMsg');
    const video = document.getElementById('video');

    try {
        console.log('--- Biometric Auth Started ---');
        console.log('Loading models from:', MODEL_URL);
        
        if (statusMsg) {
            statusMsg.textContent = 'Loading AI Models...';
            statusMsg.className = 'loading';
        }
        
        // Load models sequentially to track progress better
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        console.log('ssdMobilenetv1 loaded');
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        console.log('faceLandmark68Net loaded');
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        console.log('faceRecognitionNet loaded');

        if (statusMsg) statusMsg.textContent = 'Loading Reference Data...';
        console.log('Fetching admin reference image: img/admin.face.jpg');
        
        const img = await faceapi.fetchImage('img/admin.face.jpg').catch(err => {
            throw new Error('Failed to load admin reference image. Please check if img/admin.face.jpg exists.');
        });
        
        const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
        
        if (!detections) {
            throw new Error('Could not extract face features from admin reference image. Image might be too dark or blurry.');
        }
        adminFaceDescriptor = detections.descriptor;
        console.log('Admin face features extracted successfully');

        if (statusMsg) statusMsg.textContent = 'Starting Camera...';
        
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} }).catch(err => {
            throw new Error('Camera Access Denied: ' + err.message);
        });

        if (video) {
            video.srcObject = stream;
            video.addEventListener('play', () => {
                if (statusMsg) {
                    statusMsg.textContent = 'Look at the camera...';
                    statusMsg.className = '';
                }
                console.log('Camera playing, starting face detection loop');
                detectFace();
            });
        }

    } catch (err) {
        console.error('Biometric Auth Error:', err);
        if (statusMsg) {
            statusMsg.textContent = 'Auth Failed: ' + err.message;
            statusMsg.className = 'error-message';
            statusMsg.style.color = '#ef4444';
        }
    }
}

async function detectFace() {
    const video = document.getElementById('video');
    const statusMsg = document.getElementById('statusMsg');

    if (!video || video.paused || video.ended) return;

    try {
        const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();

        if (detection) {
            if (adminFaceDescriptor) {
                const distance = faceapi.euclideanDistance(adminFaceDescriptor, detection.descriptor);
                console.log('Face Match Distance:', distance.toFixed(4));

                // Lower distance = better match. Typical threshold is 0.4 - 0.6
                if (distance < 0.45) { 
                    if (statusMsg) {
                        statusMsg.textContent = 'Face Verified! Redirecting...';
                        statusMsg.style.color = '#10b981'; 
                    }
                    
                    console.log('Access Granted');
                    sessionStorage.setItem('adminAuth', 'true');
                    sessionStorage.setItem('userEmail', 'admin@validator.com');
                    setTimeout(() => {
                        window.location.href = 'admin.html';
                    }, 1000);
                    return;
                } else {
                    if (statusMsg) {
                        statusMsg.textContent = 'Face Not Recognized. (Dist: ' + distance.toFixed(2) + ')';
                        statusMsg.style.color = '#f59e0b';
                    }
                }
            }
        } else {
            if (statusMsg) {
                statusMsg.textContent = 'No Face Detected. Adjust lighting/position.';
                statusMsg.style.color = '#6366f1';
            }
        }
    } catch (error) {
        console.error('Detection Loop Error:', error);
    }

    setTimeout(detectFace, 400); // Slightly faster loop
}
