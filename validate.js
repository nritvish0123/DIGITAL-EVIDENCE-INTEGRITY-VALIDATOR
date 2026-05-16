const evidenceCodeInput = document.getElementById('evidenceCode');
const reEvidenceFile = document.getElementById('reEvidenceFile');
const reSelectBtn = document.getElementById('reSelectBtn');
const reFileName = document.getElementById('reFileName');
const startValidationBtn = document.getElementById('startValidationBtn');
const resultsContainer = document.getElementById('resultsContainer');

const integrityVal = document.getElementById('integrityVal');
const tamperVal = document.getElementById('tamperVal');
const newHashVal = document.getElementById('newHashVal');
const statusBadge = document.getElementById('statusBadge');

if (reSelectBtn) {
    reSelectBtn.addEventListener('click', () => reEvidenceFile.click());
}

if (reEvidenceFile) {
    reEvidenceFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            reFileName.textContent = file.name;
        }
    });
}

if (startValidationBtn) {
    startValidationBtn.addEventListener('click', async () => {
        const evidenceCode = evidenceCodeInput.value.trim();
        const file = reEvidenceFile.files[0];

        if (!evidenceCode) {
            showToast('Please enter an Evidence Code', 'error');
            return;
        }
        if (!file) {
            showToast('Please select a file to compare', 'error');
            return;
        }

        startValidationBtn.disabled = true;
        startValidationBtn.textContent = 'Processing...';
        resultsContainer.classList.add('hidden');

        try {
            const formData = new FormData();
            formData.append('evidenceCode', evidenceCode);
            formData.append('evidence', file);
            formData.append('uploaderName', localStorage.getItem('userName') || 'User');

            const response = await fetch(`${API_URL}/revalidate-evidence`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Server responded with ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                // Update UI with results safely
                if (integrityVal) integrityVal.textContent = `${result.integrityPercentage}%`;
                if (tamperVal) tamperVal.textContent = `${result.tamperPercentage}%`;
                newHashVal.textContent = result.newHash.substring(0, 32) + '...';
                newHashVal.title = result.newHash;
                
                const originalHashVal = document.getElementById('originalHashVal');
                if (originalHashVal) {
                    originalHashVal.textContent = (result.originalHash || '').substring(0, 32) + '...';
                    originalHashVal.title = result.originalHash;
                }

                const modificationSection = document.getElementById('modificationSection');
                const modificationPoint = document.getElementById('modificationPoint');

                if (typeof result.differenceOffset === 'number' && modificationSection && modificationPoint) {
                    modificationSection.classList.remove('hidden');
                    modificationPoint.textContent = `First modification detected at byte offset: ${result.differenceOffset.toLocaleString()}`;
                } else if (modificationSection) {
                    modificationSection.classList.add('hidden');
                }
                
                // Probabilistic Results
                if (result.validationResult) {
                    const score = (result.validationResult.confidenceScore * 100).toFixed(0);
                    const confidenceVal = document.getElementById('confidenceVal');
                    if (confidenceVal) confidenceVal.textContent = `${score}%`;
                    
                    // Render Authority List
                    const authorityList = document.getElementById('authorityList');
                    if (authorityList) {
                        authorityList.innerHTML = result.validationResult.validations.map(auth => `
                            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding: 0.5rem 0;">
                                <div>
                                    <div style="font-size: 0.85rem; font-weight: 600;">${auth.authorityName}</div>
                                    <div style="font-size: 0.65rem; color: rgba(255,255,255,0.5);">Sig: ${auth.signature.substring(0, 16)}...</div>
                                </div>
                                <span style="font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 4px; background: ${auth.status === 'VALIDATED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${auth.status === 'VALIDATED' ? '#10b981' : '#ef4444'}; font-weight: 700;">
                                    ${auth.status}
                                </span>
                            </div>
                        `).join('');
                    }
                }

                if (result.integrityPercentage === 100) {
                    statusBadge.textContent = 'AUTHENTIC EVIDENCE';
                    statusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
                    statusBadge.style.color = '#10b981';
                    showToast('Integrity confirmed!', 'success');
                } else {
                    statusBadge.textContent = 'TAMPERING DETECTED';
                    statusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
                    statusBadge.style.color = '#ef4444';
                    showToast('Warning: Hash mismatch detected!', 'error');
                }

                if (resultsContainer) {
                    resultsContainer.classList.remove('hidden');
                    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } else {
                showToast(result.message || 'Validation failed', 'error');
            }
        } catch (error) {
            console.error('Validation error details:', error);
            showToast(error.message || 'Connection error', 'error');
        } finally {
            startValidationBtn.disabled = false;
            startValidationBtn.textContent = 'Start Validation & Comparison';
        }
    });
}
