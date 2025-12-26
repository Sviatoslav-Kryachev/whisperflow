const API_BASE = "http://127.0.0.1:8000";

async function apiUploadAudio(file, model) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", model);

    const response = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Ошибка загрузки" }));
        throw new Error(errorData.detail || "Ошибка загрузки");
    }

    return await response.json();
}

async function apiGetTranscript(fileId) {
    const response = await fetch(`${API_BASE}/transcript/${fileId}`);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Транскрипция не найдена" }));
        throw new Error(errorData.detail || "Транскрипция не найдена");
    }
    
    return await response.json();
}

async function apiListTranscripts() {
    const response = await fetch(`${API_BASE}/transcripts/list`);
    
    if (!response.ok) {
        throw new Error("Ошибка загрузки списка транскрипций");
    }
    
    return await response.json();
}

async function apiGetStatus(fileId) {
    const response = await fetch(`${API_BASE}/status/${fileId}`);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Статус не найден" }));
        throw new Error(errorData.detail || "Статус не найден");
    }
    
    return await response.json();
}

async function apiRetryTranscript(fileId) {
    const response = await fetch(`${API_BASE}/retry/${fileId}`, {
        method: "POST"
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Ошибка повтора" }));
        throw new Error(errorData.detail || "Ошибка повтора");
    }
    
    return await response.json();
}

async function apiRenameTranscript(fileId, newName) {
    const response = await fetch(`${API_BASE}/transcripts/rename/${fileId}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ new_name: newName })
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Ошибка переименования" }));
        throw new Error(errorData.detail || "Ошибка переименования");
    }
    
    return await response.json();
}

async function apiDeleteTranscript(fileId) {
    const response = await fetch(`${API_BASE}/transcripts/delete/${fileId}`, {
        method: "DELETE"
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Ошибка удаления" }));
        throw new Error(errorData.detail || "Ошибка удаления");
    }
    
    return await response.json();
}

// === Folders API ===

async function apiListFolders() {
    const response = await fetch(`${API_BASE}/folders/list`);
    
    if (!response.ok) {
        throw new Error("Ошибка загрузки папок");
    }
    
    return await response.json();
}

async function apiCreateFolder(name) {
    const response = await fetch(`${API_BASE}/folders/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Ошибка создания папки" }));
        throw new Error(errorData.detail || "Ошибка создания папки");
    }
    
    return await response.json();
}

async function apiRenameFolder(folderId, name) {
    const response = await fetch(`${API_BASE}/folders/rename/${folderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Ошибка переименования папки" }));
        throw new Error(errorData.detail || "Ошибка переименования папки");
    }
    
    return await response.json();
}

async function apiDeleteFolder(folderId) {
    const response = await fetch(`${API_BASE}/folders/delete/${folderId}`, {
        method: "DELETE"
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Ошибка удаления папки" }));
        throw new Error(errorData.detail || "Ошибка удаления папки");
    }
    
    return await response.json();
}

async function apiMoveToFolder(fileId, folderId) {
    const response = await fetch(`${API_BASE}/transcripts/move/${fileId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: folderId })
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Ошибка перемещения" }));
        throw new Error(errorData.detail || "Ошибка перемещения");
    }
    
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
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error("Ошибка загрузки списка транскрипций");
    }
    
    return await response.json();
}
