// Model selector functionality

// Select model
window.selectModel = function(model) {
    // Update hidden input
    const modelInput = document.getElementById('modelSelect');
    if (modelInput) {
        modelInput.value = model;
    }
    
    // Update visual selection
    const options = document.querySelectorAll('.model-option');
    options.forEach(option => {
        if (option.dataset.model === model) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
    
    // Trigger change event for compatibility
    if (modelInput) {
        modelInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
};

// Initialize model selector on page load
document.addEventListener('DOMContentLoaded', function() {
    const modelInput = document.getElementById('modelSelect');
    if (modelInput) {
        const defaultModel = modelInput.value || 'base';
        selectModel(defaultModel);
    }
});

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        const modelInput = document.getElementById('modelSelect');
        if (modelInput) {
            const defaultModel = modelInput.value || 'base';
            selectModel(defaultModel);
        }
    });
} else {
    const modelInput = document.getElementById('modelSelect');
    if (modelInput) {
        const defaultModel = modelInput.value || 'base';
        selectModel(defaultModel);
    }
}





