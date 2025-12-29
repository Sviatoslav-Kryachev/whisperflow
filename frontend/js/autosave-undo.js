// Auto-save and Undo/Redo functionality for transcript editing

// Auto-save state
let autoSaveTimer = null;
let autoSaveDelay = 2000; // 2 seconds delay after typing stops
let pendingChanges = {}; // {segmentIndex: {text: newText, timestamp: Date}}
let isAutoSaving = false;

// Undo/Redo history
let editHistory = []; // Array of history states
let historyIndex = -1; // Current position in history
const MAX_HISTORY_SIZE = 50;

// Initialize history with current state
function initializeHistory() {
    editHistory = [];
    historyIndex = -1;
    
    // Save initial state
    const initialState = getCurrentTranscriptState();
    editHistory.push(initialState);
    historyIndex = 0;
    updateUndoRedoButtons();
}

// Get current transcript state
function getCurrentTranscriptState() {
    return {
        segments: transcriptSegments.map(seg => ({
            text: seg.text,
            start: seg.start,
            end: seg.end,
            startSeconds: seg.startSeconds,
            endSeconds: seg.endSeconds
        })),
        timestamp: Date.now()
    };
}

// Save state to history
function saveToHistory() {
    // Remove any states after current index (when doing undo and then new edit)
    if (historyIndex < editHistory.length - 1) {
        editHistory = editHistory.slice(0, historyIndex + 1);
    }
    
    // Add new state
    const newState = getCurrentTranscriptState();
    editHistory.push(newState);
    historyIndex++;
    
    // Limit history size
    if (editHistory.length > MAX_HISTORY_SIZE) {
        editHistory.shift();
        historyIndex--;
    }
    
    updateUndoRedoButtons();
}

// Undo last edit
window.undoEdit = function() {
    if (historyIndex <= 0) return; // Can't undo initial state
    
    // Cancel any pending auto-save
    cancelAutoSave();
    
    historyIndex--;
    applyHistoryState(editHistory[historyIndex]);
    updateUndoRedoButtons();
    showMessage('Отменено', 'success');
}

// Redo last undone edit
window.redoEdit = function() {
    if (historyIndex >= editHistory.length - 1) return; // Nothing to redo
    
    // Cancel any pending auto-save
    cancelAutoSave();
    
    historyIndex++;
    applyHistoryState(editHistory[historyIndex]);
    updateUndoRedoButtons();
    if (typeof showMessage === 'function') {
        showMessage('Повторено', 'success');
    }
}

// Apply history state to transcript
function applyHistoryState(state) {
    if (!state || !state.segments) return;
    
    // Update transcript segments
    state.segments.forEach((segState, index) => {
        if (transcriptSegments[index]) {
            transcriptSegments[index].text = segState.text;
            transcriptSegments[index].start = segState.start;
            transcriptSegments[index].end = segState.end;
            transcriptSegments[index].startSeconds = segState.startSeconds;
            transcriptSegments[index].endSeconds = segState.endSeconds;
        }
    });
    
    // Re-render segments
    if (typeof renderTranscriptSegments === 'function') {
        renderTranscriptSegments();
    }
    
    // Save to server after undo/redo
    if (transcriptViewFileId && typeof apiUpdateTranscript === 'function') {
        const fullTranscript = transcriptSegments.map(seg => {
            if (seg.start && seg.end) {
                return `[${seg.start} --> ${seg.end}]  ${seg.text}`;
            }
            return seg.text;
        }).join('\n');
        
        // Save asynchronously, don't wait
        apiUpdateTranscript(transcriptViewFileId, fullTranscript).catch(err => {
            console.error('Error saving after undo/redo:', err);
        });
    }
}

// Update undo/redo button states
function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    if (undoBtn) {
        undoBtn.disabled = historyIndex <= 0;
        undoBtn.title = historyIndex <= 0 ? 'Нечего отменять' : 'Отменить (Ctrl+Z)';
    }
    
    if (redoBtn) {
        redoBtn.disabled = historyIndex >= editHistory.length - 1;
        redoBtn.title = historyIndex >= editHistory.length - 1 ? 'Нечего повторять' : 'Повторить (Ctrl+Y)';
    }
}

// Track text change for auto-save
function trackTextChange(segmentIndex, newText) {
    // Store change
    pendingChanges[segmentIndex] = {
        text: newText,
        timestamp: Date.now()
    };
    
    // Save to history immediately for undo/redo
    // (but only if text actually changed)
    const segment = transcriptSegments[segmentIndex];
    if (segment && segment.text !== newText) {
        segment.text = newText;
        // We'll save to history after auto-save completes
    }
    
    // Reset auto-save timer
    scheduleAutoSave();
}

// Schedule auto-save
function scheduleAutoSave() {
    // Clear existing timer
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }
    
    // Set new timer
    autoSaveTimer = setTimeout(() => {
        performAutoSave();
    }, autoSaveDelay);
}

// Cancel auto-save
function cancelAutoSave() {
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
    }
    pendingChanges = {};
}

// Perform auto-save
async function performAutoSave() {
    if (isAutoSaving || Object.keys(pendingChanges).length === 0) return;
    if (!transcriptViewFileId) return;
    
    isAutoSaving = true;
    
    try {
        // Update segments with pending changes
        Object.keys(pendingChanges).forEach(index => {
            const change = pendingChanges[index];
            const segIndex = parseInt(index);
            if (transcriptSegments[segIndex]) {
                transcriptSegments[segIndex].text = change.text;
            }
        });
        
        // Save to history for undo/redo
        saveToHistory();
        
        // Build full transcript
        const fullTranscript = transcriptSegments.map(seg => {
            if (seg.start && seg.end) {
                return `[${seg.start} --> ${seg.end}]  ${seg.text}`;
            }
            return seg.text;
        }).join('\n');
        
        // Save to server
        await apiUpdateTranscript(transcriptViewFileId, fullTranscript);
        
        // Clear pending changes
        const changedCount = Object.keys(pendingChanges).length;
        pendingChanges = {};
        
        // Update UI (re-render to reflect saved state)
        renderTranscriptSegments();
        
        // Show notification
        showMessage(`Автосохранено ${changedCount} ${changedCount === 1 ? 'изменение' : 'изменений'}`, 'success');
        
    } catch (error) {
        console.error('Auto-save error:', error);
        // Don't show error notification for auto-save failures
        // User can manually save if needed
    } finally {
        isAutoSaving = false;
        autoSaveTimer = null;
    }
}

// Setup keyboard shortcuts for undo/redo
document.addEventListener('keydown', function(e) {
    // Check if user is editing a segment
    const activeElement = document.activeElement;
    const isEditingSegment = activeElement && 
                             activeElement.classList.contains('segment-original') && 
                             activeElement.isContentEditable;
    
    // Only handle shortcuts when not editing
    if (isEditingSegment && !e.ctrlKey && !e.metaKey) {
        return;
    }
    
    // Undo: Ctrl+Z (Cmd+Z on Mac)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (typeof undoEdit === 'function') {
            undoEdit();
        }
    }
    
    // Redo: Ctrl+Y or Ctrl+Shift+Z (Cmd+Shift+Z on Mac)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (typeof redoEdit === 'function') {
            redoEdit();
        }
    }
});

// Export functions for use in dashboard.js
window.trackTextChange = trackTextChange;
window.cancelAutoSave = cancelAutoSave;
window.initializeHistory = initializeHistory;
window.saveToHistory = saveToHistory;

