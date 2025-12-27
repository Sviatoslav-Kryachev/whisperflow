const API_BASE = "http://127.0.0.1:8000";

// Обёртка для обработки ошибок fetch
async function safeFetch(url, options = {}) {
    try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                const text = await response.text().catch(() => "");
                errorData = { detail: text || `HTTP ${response.status}: ${response.statusText}` };
            }
            throw new Error(errorData.detail || `Ошибка: ${response.status} ${response.statusText}`);
        }
        
        return response;
    } catch (error) {
        // Обработка сетевых ошибок (CORS, нет подключения и т.д.)
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error("Ошибка подключения к серверу. Убедитесь, что сервер запущен на http://127.0.0.1:8000");
        }
        throw error;
    }
}

async function apiUploadAudio(file, model, language = 'auto') {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", model);
    formData.append("language", language);

    const response = await safeFetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData
    });

    return await response.json();
}

async function apiGetTranscript(fileId) {
    const response = await safeFetch(`${API_BASE}/transcript/${fileId}`);
    return await response.json();
}

async function apiListTranscripts() {
    const response = await safeFetch(`${API_BASE}/transcripts/list`);
    return await response.json();
}

async function apiGetStatus(fileId) {
    const response = await safeFetch(`${API_BASE}/status/${fileId}`);
    return await response.json();
}

async function apiRetryTranscript(fileId) {
    const response = await safeFetch(`${API_BASE}/retry/${fileId}`, {
        method: "POST"
    });
    return await response.json();
}

async function apiRenameTranscript(fileId, newName) {
    const response = await safeFetch(`${API_BASE}/transcripts/rename/${fileId}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ new_name: newName })
    });
    return await response.json();
}

async function apiDeleteTranscript(fileId) {
    const response = await safeFetch(`${API_BASE}/transcripts/delete/${fileId}`, {
        method: "DELETE"
    });
    return await response.json();
}

// === Folders API ===

async function apiListFolders() {
    const response = await safeFetch(`${API_BASE}/folders/list`);
    return await response.json();
}

async function apiCreateFolder(name) {
    const response = await safeFetch(`${API_BASE}/folders/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
    });
    return await response.json();
}

async function apiRenameFolder(folderId, name) {
    const response = await safeFetch(`${API_BASE}/folders/rename/${folderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
    });
    return await response.json();
}

async function apiDeleteFolder(folderId) {
    const response = await safeFetch(`${API_BASE}/folders/delete/${folderId}`, {
        method: "DELETE"
    });
    return await response.json();
}

async function apiMoveToFolder(fileId, folderId) {
    const response = await safeFetch(`${API_BASE}/transcripts/move/${fileId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: folderId })
    });
    return await response.json();
}

async function apiListTranscriptsFiltered(folderId = null, recent = false) {
    let url = `${API_BASE}/transcripts/list`;
    const params = new URLSearchParams();
    
    if (recent) {
        params.append('recent', 'true');
    } else if (folderId !== null) {
        params.append('folder_id', folderId);
    }
    
    if (params.toString()) {
        url += '?' + params.toString();
    }
    
    const response = await safeFetch(url);
    return await response.json();
}

// === Export API ===

function getExportUrl(fileId, format) {
    return `${API_BASE}/export/${format}/${fileId}`;
}

async function apiExportTranscript(fileId, format) {
    const url = getExportUrl(fileId, format);
    
    const response = await safeFetch(url);
    
    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `transcript.${format}`;
    
    if (contentDisposition) {
        // Try to extract filename from header
        const filenameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);
        if (filenameMatch) {
            filename = decodeURIComponent(filenameMatch[1]);
        } else {
            const simpleMatch = contentDisposition.match(/filename="([^"]+)"/);
            if (simpleMatch) {
                filename = simpleMatch[1];
            }
        }
    }
    
    // Create blob and download
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    return true;
}
