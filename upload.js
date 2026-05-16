const evidenceFile = document.getElementById("evidenceFile");
const selectBtn = document.getElementById("selectBtn");
const submitBtn = document.getElementById("submitBtn");
const fileInfo = document.getElementById("fileInfo");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const filePrompt = document.getElementById("filePrompt");
const idContainer = document.getElementById("idContainer");
const evidenceIdDisplay = document.getElementById("evidenceIdDisplay");

if (selectBtn && evidenceFile) {
  selectBtn.addEventListener("click", () => {
    evidenceFile.click();
  });
}

if (evidenceFile) {
  evidenceFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelection(file);
    }
  });
}

function handleFileSelection(file) {
  // Show file info
  fileName.textContent = file.name;
  fileSize.textContent = formatBytes(file.size);

  fileInfo.classList.remove("hidden");
  filePrompt.classList.add("hidden");

  // Generate Evidence ID and Evidence Code separately
  const generatedId = "EVI-ID_" + Math.floor(100000000 + Math.random() * 900000000).toString(); // EVI-ID_ + 9 digits
  const generatedCode = Math.floor(10000 + Math.random() * 90000).toString(); // 5 digits

  evidenceIdDisplay.textContent = generatedId;
  document.getElementById("evidenceCodeDisplay").textContent = generatedCode;
  idContainer.classList.remove("hidden");

  // Show submit button
  submitBtn.classList.remove("hidden");

  showToast("File selected and IDs generated!", "success");
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

if (submitBtn) {
  submitBtn.addEventListener("click", async () => {
    const file = evidenceFile.files[0];
    const evidenceId = evidenceIdDisplay.textContent;
    const evidenceCode = document.getElementById(
      "evidenceCodeDisplay",
    ).textContent;
    const userEmail = sessionStorage.getItem("userEmail") || "anonymous@demo.com";

    if (!file) {
      showToast("Please select a file first", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Uploading & Validating...";

    try {
      const formData = new FormData();
      formData.append("evidence", file);
      formData.append("evidenceId", evidenceId);
      formData.append("evidenceCode", evidenceCode);
      formData.append("email", userEmail);

      const response = await fetch(`${API_URL}/upload-evidence`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server responded with ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        showToast("Evidence verified & stored!", "success");

        // Show validation info
        const msg = `Hash: ${result.data.hash.substring(0, 16)}...\nConfidence: ${(result.data.confidenceScore * 100).toFixed(0)}%`;
        alert(
          `Evidence Integrity Validated!\n\n${msg}\n\nStatus: ${result.data.status}`,
        );

        setTimeout(() => {
          window.location.href = typeof window.getDashboardURL === 'function' ? window.getDashboardURL() : "dashboard.html";
        }, 2000);
      } else {
        showToast(result.message || "Upload failed", "error");
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Evidence";
      }
    } catch (error) {
      console.error("Upload error:", error);
      showToast("Connection error. Is server running?", "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Evidence";
    }
  });
}

// Drag and drop support
const dropZone = document.getElementById("dropZone");
if (dropZone) {
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(
      eventName,
      () => (dropZone.style.borderColor = "#818cf8"),
      false,
    );
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(
      eventName,
      () => (dropZone.style.borderColor = "rgba(255,255,255,0.1)"),
      false,
    );
  });

  dropZone.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    if (file) {
      evidenceFile.files = dt.files;
      handleFileSelection(file);
    }
  });
}
