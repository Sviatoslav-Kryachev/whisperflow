// Additional organization functions to integrate with dashboard.js

// Toggle favorite
window.toggleFileFavorite = function(fileId) {
    if (typeof toggleFavorite === 'function') {
        const newState = toggleFavorite(fileId);
        // Re-render to update UI
        if (typeof loadTranscripts === 'function') {
            loadTranscripts();
        }
        return newState;
    }
};

// Open tags modal
window.openTagsModal = function(fileId) {
    const modal = document.getElementById('tagsModal');
    const tagsInput = document.getElementById('tagsInput');
    const tagsFileId = document.getElementById('tagsFileId');
    
    if (!modal || !tagsInput) return;
    
    // Get current tags
    const currentTags = typeof getFileTags === 'function' ? getFileTags(fileId) : [];
    tagsInput.value = currentTags.join(', ');
    if (tagsFileId) tagsFileId.value = fileId;
    
    modal.style.display = 'flex';
    tagsInput.focus();
};

// Close tags modal
window.closeTagsModal = function() {
    const modal = document.getElementById('tagsModal');
    if (modal) modal.style.display = 'none';
};

// Save tags
window.saveTags = function() {
    const tagsInput = document.getElementById('tagsInput');
    const tagsFileId = document.getElementById('tagsFileId');
    
    if (!tagsInput || !tagsFileId) return;
    
    const fileId = tagsFileId.value;
    const tagsString = tagsInput.value.trim();
    
    // Parse tags (comma or space separated)
    const tags = tagsString
        .split(/[,\s]+/)
        .map(t => t.trim())
        .filter(t => t.length > 0);
    
    if (typeof setFileTags === 'function') {
        setFileTags(fileId, tags);
        closeTagsModal();
        
        // Refresh display
        if (typeof refreshFilters === 'function') {
            refreshFilters();
        }
        if (typeof loadTranscripts === 'function') {
            loadTranscripts();
        }
    }
};








