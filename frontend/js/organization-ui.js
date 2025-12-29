// UI functions for file organization: search, filters, sorting

// Current state
let currentSearchQuery = '';
let currentFilters = {
    status: 'all',
    model: 'all',
    language: 'all',
    dateFrom: '',
    dateTo: '',
    sizeMin: '',
    sizeMax: '',
    favorite: false,
    tags: []
};
let currentSort = { by: 'date', order: 'desc' };
let allTranscripts = []; // Cache of all transcripts

// Toggle filters panel
window.toggleFilters = function() {
    const panel = document.getElementById('filtersPanel');
    const btn = document.getElementById('filterToggleBtn');
    if (panel.style.display === 'none' || !panel.style.display) {
        panel.style.display = 'block';
        if (typeof t !== 'undefined') {
            btn.innerHTML = `<span data-i18n="filters.hide">🔼 Скрыть фильтры</span>`;
            updatePageTranslations();
        } else {
            btn.textContent = '🔼 Скрыть фильтры';
        }
        updateTagsFilter();
    } else {
        panel.style.display = 'none';
        if (typeof t !== 'undefined') {
            btn.innerHTML = `<span data-i18n="filters.toggle">🔽 Фильтры</span>`;
            updatePageTranslations();
        } else {
            btn.textContent = '🔽 Фильтры';
        }
    }
};

// Clear search
window.clearSearch = function() {
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    if (searchInput) {
        searchInput.value = '';
        currentSearchQuery = '';
        if (searchClear) searchClear.style.display = 'none';
        applySearchAndFilters();
    }
};

// Apply search
function applySearch() {
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    
    if (searchInput) {
        currentSearchQuery = searchInput.value.trim();
        if (searchClear) {
            searchClear.style.display = currentSearchQuery ? 'block' : 'none';
        }
        applySearchAndFilters();
    }
}

// Apply filters
window.applyFilters = function() {
    // Get filter values
    const statusSelect = document.getElementById('filterStatus');
    const modelSelect = document.getElementById('filterModel');
    const dateFrom = document.getElementById('filterDateFrom');
    const dateTo = document.getElementById('filterDateTo');
    const favoriteCheck = document.getElementById('filterFavorite');
    
    currentFilters = {
        status: statusSelect ? statusSelect.value : 'all',
        model: modelSelect ? modelSelect.value : 'all',
        language: 'all',
        dateFrom: dateFrom ? dateFrom.value : '',
        dateTo: dateTo ? dateTo.value : '',
        sizeMin: '',
        sizeMax: '',
        favorite: favoriteCheck ? favoriteCheck.checked : false,
        tags: getSelectedFilterTags()
    };
    
    applySearchAndFilters();
};

// Clear filters
window.clearFilters = function() {
    const statusSelect = document.getElementById('filterStatus');
    const modelSelect = document.getElementById('filterModel');
    const dateFrom = document.getElementById('filterDateFrom');
    const dateTo = document.getElementById('filterDateTo');
    const favoriteCheck = document.getElementById('filterFavorite');
    
    if (statusSelect) statusSelect.value = 'all';
    if (modelSelect) modelSelect.value = 'all';
    if (dateFrom) dateFrom.value = '';
    if (dateTo) dateTo.value = '';
    if (favoriteCheck) favoriteCheck.checked = false;
    
    // Clear tag filters
    const tagCheckboxes = document.querySelectorAll('.tag-filter-checkbox');
    tagCheckboxes.forEach(cb => cb.checked = false);
    
    currentFilters = {
        status: 'all',
        model: 'all',
        language: 'all',
        dateFrom: '',
        dateTo: '',
        sizeMin: '',
        sizeMax: '',
        favorite: false,
        tags: []
    };
    
    applySearchAndFilters();
};

// Apply sorting
window.applySorting = function() {
    const sortSelect = document.getElementById('sortSelect');
    if (!sortSelect) return;
    
    const value = sortSelect.value;
    const [by, order] = value.split('-');
    currentSort = { by, order };
    
    applySearchAndFilters();
};

// Apply search, filters, and sorting
function applySearchAndFilters() {
    // Try to get from global cache if local cache is empty
    if (allTranscripts.length === 0 && typeof window.allTranscriptsCache !== 'undefined' && Array.isArray(window.allTranscriptsCache) && window.allTranscriptsCache.length > 0) {
        allTranscripts = window.allTranscriptsCache;
    }
    
    // If still no transcripts, check if we should show empty state
    if (allTranscripts.length === 0) {
        const transcriptsList = document.getElementById('transcriptsList');
        if (transcriptsList) {
            transcriptsList.innerHTML = `
                <div class="empty-state">
                    <p>Пока нет транскрипций</p>
                    <p class="hint">Загрузите аудиофайл для начала</p>
                </div>
            `;
        }
        return;
    }
    
    let result = [...allTranscripts];
    
    // Apply search
    if (currentSearchQuery && typeof searchTranscripts === 'function') {
        result = searchTranscripts(result, currentSearchQuery);
    }
    
    // Apply filters
    if (typeof filterTranscripts === 'function') {
        result = filterTranscripts(result, currentFilters);
    }
    
    // Apply sorting
    if (typeof sortTranscripts === 'function') {
        result = sortTranscripts(result, currentSort.by, currentSort.order);
    }
    
    // Re-render (always render, even if filtered result is empty)
    if (typeof renderTranscripts === 'function') {
        renderTranscripts(result);
    } else {
        // Fallback: direct render if function not available
        const transcriptsList = document.getElementById('transcriptsList');
        if (transcriptsList && result.length === 0) {
            transcriptsList.innerHTML = `
                <div class="empty-state">
                    <p>Нет результатов по заданным фильтрам</p>
                    <p class="hint">Попробуйте изменить параметры поиска или фильтры</p>
                </div>
            `;
        }
    }
}

// Make function globally accessible
window.applySearchAndFilters = applySearchAndFilters;

// Update tags filter UI
function updateTagsFilter() {
    const container = document.getElementById('tagsFilterContainer');
    if (!container || typeof getAllTags !== 'function') return;
    
    const allTags = getAllTags();
    
    if (allTags.length === 0) {
        container.innerHTML = '<span class="no-tags">Нет тегов</span>';
        return;
    }
    
    container.innerHTML = allTags.map(tag => `
        <label class="tag-filter-label">
            <input type="checkbox" class="tag-filter-checkbox" value="${escapeHtml(tag)}" onchange="applyFilters()" />
            <span class="tag-badge">${escapeHtml(tag)}</span>
        </label>
    `).join('');
}

// Get selected filter tags
function getSelectedFilterTags() {
    const checkboxes = document.querySelectorAll('.tag-filter-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// Setup search input listener
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        // Debounce search
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                applySearch();
            }, 300);
        });
        
        // Enter key to search immediately
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                clearTimeout(searchTimeout);
                applySearch();
            }
        });
    }
});

// Export function to update transcripts cache
window.updateTranscriptsCache = function(transcripts) {
    allTranscripts = transcripts || [];
    // Also store in global cache as backup
    window.allTranscriptsCache = allTranscripts;
    // Don't call applySearchAndFilters here - let the caller decide when to render
};

// Export allTranscripts for debugging
window.getAllTranscripts = function() {
    return allTranscripts.length > 0 ? allTranscripts : (window.allTranscriptsCache || []);
};

// Export function to refresh filters
window.refreshFilters = function() {
    updateTagsFilter();
    applySearchAndFilters();
};

