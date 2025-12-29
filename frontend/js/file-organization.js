// File organization module: search, filters, sorting, tags, favorites

// Storage for tags and favorites (using localStorage)
const STORAGE_TAGS_KEY = 'whisperflow_tags';
const STORAGE_FAVORITES_KEY = 'whisperflow_favorites';

// Get tags from storage
function getTags() {
    try {
        const stored = localStorage.getItem(STORAGE_TAGS_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

// Get favorites from storage
function getFavorites() {
    try {
        const stored = localStorage.getItem(STORAGE_FAVORITES_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

// Save tags to storage
function saveTags(tags) {
    try {
        localStorage.setItem(STORAGE_TAGS_KEY, JSON.stringify(tags));
    } catch (err) {
        console.error('Error saving tags:', err);
    }
}

// Save favorites to storage
function saveFavorites(favorites) {
    try {
        localStorage.setItem(STORAGE_FAVORITES_KEY, JSON.stringify(favorites));
    } catch (err) {
        console.error('Error saving favorites:', err);
    }
}

// Get tags for a file
function getFileTags(fileId) {
    const tags = getTags();
    return tags[fileId] || [];
}

// Set tags for a file
function setFileTags(fileId, tagList) {
    const tags = getTags();
    tags[fileId] = tagList;
    saveTags(tags);
}

// Add tag to file
function addTagToFile(fileId, tag) {
    const currentTags = getFileTags(fileId);
    if (!currentTags.includes(tag)) {
        setFileTags(fileId, [...currentTags, tag]);
    }
}

// Remove tag from file
function removeTagFromFile(fileId, tag) {
    const currentTags = getFileTags(fileId);
    setFileTags(fileId, currentTags.filter(t => t !== tag));
}

// Toggle favorite
function toggleFavorite(fileId) {
    const favorites = getFavorites();
    favorites[fileId] = !favorites[fileId];
    saveFavorites(favorites);
    return favorites[fileId];
}

// Check if file is favorite
function isFavorite(fileId) {
    const favorites = getFavorites();
    return favorites[fileId] === true;
}

// Get all unique tags
function getAllTags() {
    const tags = getTags();
    const allTags = new Set();
    Object.values(tags).forEach(fileTags => {
        fileTags.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags).sort();
}

// Search transcripts by text
function searchTranscripts(transcripts, searchQuery) {
    if (!searchQuery || !searchQuery.trim()) {
        return transcripts;
    }
    
    const query = searchQuery.toLowerCase().trim();
    
    return transcripts.filter(transcript => {
        // Search in filename
        if (transcript.filename && transcript.filename.toLowerCase().includes(query)) {
            return true;
        }
        
        // Search in transcript text (if available)
        if (transcript.transcript && transcript.transcript.toLowerCase().includes(query)) {
            return true;
        }
        
        // Search in preview
        if (transcript.preview && transcript.preview.toLowerCase().includes(query)) {
            return true;
        }
        
        // Search in tags
        const fileTags = getFileTags(transcript.id);
        if (fileTags.some(tag => tag.toLowerCase().includes(query))) {
            return true;
        }
        
        return false;
    });
}

// Filter transcripts
function filterTranscripts(transcripts, filters) {
    let filtered = [...transcripts];
    
    // Filter by status
    if (filters.status && filters.status !== 'all') {
        filtered = filtered.filter(t => t.status === filters.status);
    }
    
    // Filter by model
    if (filters.model && filters.model !== 'all') {
        filtered = filtered.filter(t => t.model === filters.model);
    }
    
    // Filter by language
    if (filters.language && filters.language !== 'all') {
        filtered = filtered.filter(t => t.language === filters.language);
    }
    
    // Filter by date range
    if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        filtered = filtered.filter(t => {
            if (!t.created_at) return false;
            return new Date(t.created_at) >= fromDate;
        });
    }
    
    if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        filtered = filtered.filter(t => {
            if (!t.created_at) return false;
            return new Date(t.created_at) <= toDate;
        });
    }
    
    // Filter by size range
    if (filters.sizeMin !== undefined && filters.sizeMin !== '') {
        const minSize = parseInt(filters.sizeMin) * 1024 * 1024; // Convert MB to bytes
        filtered = filtered.filter(t => t.size && t.size >= minSize);
    }
    
    if (filters.sizeMax !== undefined && filters.sizeMax !== '') {
        const maxSize = parseInt(filters.sizeMax) * 1024 * 1024; // Convert MB to bytes
        filtered = filtered.filter(t => t.size && t.size <= maxSize);
    }
    
    // Filter by favorite
    if (filters.favorite === true) {
        filtered = filtered.filter(t => isFavorite(t.id));
    }
    
    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
        filtered = filtered.filter(t => {
            const fileTags = getFileTags(t.id);
            return filters.tags.some(tag => fileTags.includes(tag));
        });
    }
    
    return filtered;
}

// Sort transcripts
function sortTranscripts(transcripts, sortBy, sortOrder = 'desc') {
    const sorted = [...transcripts];
    
    sorted.sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
            case 'date':
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                comparison = dateA - dateB;
                break;
                
            case 'name':
                comparison = (a.filename || '').localeCompare(b.filename || '', 'ru');
                break;
                
            case 'size':
                comparison = (a.size || 0) - (b.size || 0);
                break;
                
            case 'duration':
                // Assuming duration is stored or can be calculated
                const durationA = a.duration || 0;
                const durationB = b.duration || 0;
                comparison = durationA - durationB;
                break;
                
            case 'favorite':
                const favA = isFavorite(a.id) ? 1 : 0;
                const favB = isFavorite(b.id) ? 1 : 0;
                comparison = favB - favA; // Favorites first
                break;
                
            default:
                return 0;
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
}

// Export functions
window.getFileTags = getFileTags;
window.setFileTags = setFileTags;
window.addTagToFile = addTagToFile;
window.removeTagFromFile = removeTagFromFile;
window.toggleFavorite = toggleFavorite;
window.isFavorite = isFavorite;
window.getAllTags = getAllTags;
window.searchTranscripts = searchTranscripts;
window.filterTranscripts = filterTranscripts;
window.sortTranscripts = sortTranscripts;





