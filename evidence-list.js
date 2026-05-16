document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.getElementById('evidenceTableBody');
    const noData = document.getElementById('noData');
    const userEmail = sessionStorage.getItem('userEmail');

    // Publicly accessible page now
    // if (!userEmail) {
    //     window.location.href = 'index.html';
    //     return;
    // }

    const isAdmin = sessionStorage.getItem('adminAuth') === 'true';
    const downloadHeader = document.getElementById('downloadHeader');

    if (isAdmin) {
        downloadHeader.classList.remove('hidden');
    }

    try {
        // Fetch all evidence
        const response = await fetch(`${API_URL}/all-evidence`);
        
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data.length > 0) {
            tableBody.innerHTML = result.data.map((e, index) => {
                const uploadDate = new Date(e.uploadedAt);
                const fileName = e.fileName || 'N/A';
                
                let downloadBtn = '';
                if (isAdmin && e.fileId) {
                    downloadBtn = `
                        <td>
                            <button onclick="downloadFile('${e.fileId}', '${fileName}')" class="btn" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; width: auto;">
                                📥 Download
                            </button>
                        </td>
                    `;
                } else if (isAdmin) {
                    downloadBtn = `<td><span style="font-size: 0.7rem; color: #64748b;">Legacy (No ID)</span></td>`;
                }

                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td><span class="evidence-id">${e.evidenceId}</span></td>
                        <td><span class="evidence-code">${e.evidenceCode}</span></td>
                        <td>${e.uploaderEmail}</td>
                        <td>${fileName}</td>
                        <td>${uploadDate.toLocaleDateString()} ${uploadDate.toLocaleTimeString()}</td>
                        <td>${(e.fileSize / 1024).toFixed(2)} KB</td>
                        ${downloadBtn}
                    </tr>
                `;
            }).join('');
            noData.classList.add('hidden');
        } else {
            noData.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error fetching evidence:', error);
        noData.textContent = `Error loading evidence records: ${error.message}`;
        noData.classList.remove('hidden');
    }
});

async function downloadFile(fileId, fileName) {
    try {
        window.location.href = `${API_URL}/download-evidence/${fileId}`;
    } catch (error) {
        console.error('Download failed:', error);
        alert('Failed to download file.');
    }
}
