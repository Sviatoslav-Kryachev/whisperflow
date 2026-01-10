// File Preview Functions
function showFilePreview(file) {
    const preview = document.getElementById('filePreview');
    const placeholder = document.getElementById('uploadPlaceholder');
    const previewName = document.getElementById('previewFileName');
    const previewSize = document.getElementById('previewFileSize');
    const previewDuration = document.getElementById('previewFileDuration');
    const previewAudio = document.getElementById('previewAudio');

    if (!preview || !placeholder) return;

    // Show preview, hide placeholder
    placeholder.style.display = 'none';
    preview.style.display = 'block';

    // Set file name
    if (previewName) {
        previewName.textContent = file.name;
    }

    // Set file size
    if (previewSize) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        previewSize.textContent = `${fileSizeMB} MB`;
    }

    // Create audio URL and load duration
    const audioURL = URL.createObjectURL(file);
    if (previewAudio) {
        previewAudio.src = audioURL;
        previewAudio.style.display = 'block';
        previewAudio.addEventListener('loadedmetadata', () => {
            if (previewDuration) {
                const duration = previewAudio.duration;
                const minutes = Math.floor(duration / 60);
                const seconds = Math.floor(duration % 60);
                previewDuration.textContent = `Длительность: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        });
    }
}

// Clear file preview
window.clearFilePreview = function() {
    const preview = document.getElementById('filePreview');
    const placeholder = document.getElementById('uploadPlaceholder');
    const previewAudio = document.getElementById('previewAudio');
    const fileInput = document.getElementById('audioFile');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const uploadBtn = document.getElementById('uploadBtn');

    if (preview) preview.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
    
    // Revoke object URL to free memory
    if (previewAudio && previewAudio.src) {
        URL.revokeObjectURL(previewAudio.src);
        previewAudio.src = '';
        previewAudio.style.display = 'none';
    }

    // Clear file input
    if (fileInput) {
        fileInput.value = '';
    }

    // Reset UI
    const fileName = document.getElementById('fileName');
    if (fileName) {
        fileName.textContent = "Выберите аудиофайл";
        fileName.style.color = "#9ca3af";
    }
    if (fileUploadArea) {
        fileUploadArea.classList.remove("has-file");
    }
    if (uploadBtn) {
        uploadBtn.disabled = true;
    }
};

// Enhanced Progress Functions
function showProgressSteps(steps) {
    const stepsContainer = document.getElementById('progressSteps');
    if (!stepsContainer) return;

    stepsContainer.innerHTML = steps.map(step => `
        <div class="progress-step ${step.active ? 'active' : ''}" data-step="${step.id}">
            <div class="progress-step-icon">${step.active ? '⟳' : ''}</div>
            <span>${step.label}</span>
        </div>
    `).join('');
}

function updateProgressStep(stepId, completed) {
    const stepsContainer = document.getElementById('progressSteps');
    if (!stepsContainer) return;

    const step = stepsContainer.querySelector(`[data-step="${stepId}"]`);
    if (!step) return;

    if (completed) {
        step.classList.remove('active');
        step.classList.add('completed');
        const icon = step.querySelector('.progress-step-icon');
        if (icon) icon.textContent = '✓';
        
        // Activate next step
        const nextStep = step.nextElementSibling;
        if (nextStep && nextStep.classList.contains('progress-step')) {
            nextStep.classList.add('active');
            const nextIcon = nextStep.querySelector('.progress-step-icon');
            if (nextIcon) nextIcon.textContent = '⟳';
        }
    }
}

function hideProgressSteps() {
    const stepsContainer = document.getElementById('progressSteps');
    if (stepsContainer) stepsContainer.innerHTML = '';
}








