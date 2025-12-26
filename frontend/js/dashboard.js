// Элементы DOM
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("audioFile");
const modelSelect = document.getElementById("modelSelect");
const uploadMessage = document.getElementById("uploadMessage");
const fileUploadArea = document.getElementById("fileUploadArea");
const fileName = document.getElementById("fileName");
const progressContainer = document.getElementById("progressContainer");
const progressBarFill = document.getElementById("progressBarFill");
const progressText = document.getElementById("progressText");
const progressPercent = document.getElementById("progressPercent");
const uploadBtnText = document.getElementById("uploadBtnText");
const transcriptsList = document.getElementById("transcriptsList");

// Текущий фильтр
let currentFilter = { type: 'recent', value: null };
let allFolders = [];

// Проверка авторизации
function checkAuth() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "login.html";
        return false;
    }
    return true;
}

// Инициализация при загрузке страницы
function initDashboard() {
    if (!checkAuth()) return;
    
    setupFileUpload();
    
    // Ждём загрузки api.js перед вызовом функций
    const checkApiLoaded = setInterval(() => {
        if (typeof apiListTranscripts === 'function' && typeof apiUploadAudio === 'function') {
            clearInterval(checkApiLoaded);
            loadFolders();
            loadTranscripts();
        }
    }, 50);
    
    // Таймаут на случай, если api.js не загрузится
    setTimeout(() => {
        clearInterval(checkApiLoaded);
        if (typeof apiListTranscripts !== 'function') {
            console.error("api.js не загружен");
            transcriptsList.innerHTML = `
                <div class="empty-state">
                    <p>Ошибка загрузки</p>
                    <p class="hint">Не удалось загрузить API функции. Обновите страницу.</p>
                </div>
            `;
        }
    }, 2000);
}

// Запускаем инициализацию после полной загрузки страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    // Если DOM уже загружен, используем window.onload для гарантии загрузки всех скриптов
    window.addEventListener('load', initDashboard);
}

// Настройка загрузки файлов
function setupFileUpload() {
    // Клик по области загрузки
    fileUploadArea.addEventListener("click", () => {
        fileInput.click();
    });

    // Drag and drop
    fileUploadArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        fileUploadArea.classList.add("dragover");
    });

    fileUploadArea.addEventListener("dragleave", () => {
        fileUploadArea.classList.remove("dragover");
    });

    fileUploadArea.addEventListener("drop", (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove("dragover");
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect();
        }
    });

    // Выбор файла через input
    fileInput.addEventListener("change", handleFileSelect);
}

function handleFileSelect() {
    const file = fileInput.files[0];
    if (file) {
        fileName.textContent = file.name;
        fileName.style.color = "#667eea";
        fileUploadArea.classList.add("has-file");
        uploadBtn.disabled = false;
        clearMessage();
    } else {
        fileName.textContent = "Выберите аудиофайл";
            fileName.style.color = "#9ca3af";
        fileUploadArea.classList.remove("has-file");
        uploadBtn.disabled = true;
    }
}

// Загрузка и транскрипция
uploadBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];
    const model = modelSelect.value;

    if (!file) {
        showMessage("Выберите файл для загрузки", "error");
        return;
    }

    // Блокируем кнопку и показываем прогресс
    uploadBtn.disabled = true;
    uploadBtnText.textContent = "Обработка...";
    progressContainer.style.display = "block";
    progressBarFill.style.width = "0%";
    progressPercent.textContent = "0%";
    progressText.textContent = "Загрузка файла...";
    clearMessage();

    try {
        // Эмуляция прогресса загрузки
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress = Math.min(progress + 5, 30);
            updateProgress(progress, "Загрузка файла...");
        }, 100);

        // Загрузка файла
        updateProgress(30, "Отправка на сервер...");
        const data = await apiUploadAudio(file, model);
        clearInterval(progressInterval);

        // Сохраняем file_id для отслеживания
        const currentFileId = data.file_id;
        
        // Начинаем отслеживать статус обработки
        updateProgress(50, "Ожидание начала обработки...");
        showMessage(`Файл загружен! ID: ${currentFileId}. Обработка начата...`, "success");
        
        // Сбрасываем форму загрузки, но продолжаем отслеживать статус
        resetUploadForm();
        
        // Запускаем отслеживание статуса
        trackProcessingStatus(currentFileId);
        
        // Обновляем список транскрипций
        await loadTranscripts();

    } catch (err) {
        showMessage("Ошибка: " + err.message, "error");
        updateProgress(0, "Ошибка");
        uploadBtn.disabled = false;
        uploadBtnText.textContent = "Загрузить и транскрибировать";
    }
});

function updateProgress(percent, text) {
    progressBarFill.style.width = percent + "%";
    progressPercent.textContent = Math.round(percent) + "%";
    progressText.textContent = text;
}

function resetUploadForm() {
    fileInput.value = "";
    fileName.textContent = "Выберите аудиофайл";
    fileName.style.color = "#9ca3af";
    fileUploadArea.classList.remove("has-file");
    uploadBtn.disabled = true;
    uploadBtnText.textContent = "Загрузить и транскрибировать";
    progressContainer.style.display = "none";
    clearMessage();
}

let messageTimeout = null;

function showMessage(text, type, duration = 4000) {
    uploadMessage.textContent = text;
    uploadMessage.className = `message ${type}`;
    
    // Очищаем предыдущий таймер
    if (messageTimeout) {
        clearTimeout(messageTimeout);
    }
    
    // Автоматически скрываем через duration мс
    if (duration > 0) {
        messageTimeout = setTimeout(() => {
            clearMessage();
        }, duration);
    }
}

function clearMessage() {
    // Плавное скрытие
    uploadMessage.style.opacity = '0';
    setTimeout(() => {
    uploadMessage.textContent = "";
    uploadMessage.className = "message";
        uploadMessage.style.opacity = '';
    }, 300);
    
    if (messageTimeout) {
        clearTimeout(messageTimeout);
        messageTimeout = null;
    }
}

// Загрузка списка транскрипций
async function loadTranscripts() {
    try {
        // Проверяем, что функция определена
        if (typeof apiListTranscriptsFiltered !== 'function') {
            console.error("apiListTranscriptsFiltered is not defined");
            transcriptsList.innerHTML = `
                <div class="empty-state">
                    <p>Ошибка загрузки транскрипций</p>
                    <p class="hint">Функция API не загружена. Обновите страницу.</p>
                </div>
            `;
            return;
        }
        
        let data;
        if (currentFilter.type === 'recent') {
            data = await apiListTranscriptsFiltered(null, true);
        } else if (currentFilter.type === 'folder') {
            data = await apiListTranscriptsFiltered(currentFilter.value, false);
        } else {
            data = await apiListTranscripts();
        }
        
        const transcripts = data.transcripts || [];
        
        if (transcripts.length === 0) {
            const emptyMessage = currentFilter.type === 'folder' 
                ? 'В этой папке пока нет файлов' 
                : 'Пока нет транскрипций';
            transcriptsList.innerHTML = `
                <div class="empty-state">
                    <p>${emptyMessage}</p>
                    <p class="hint">Загрузите аудиофайл для начала</p>
                </div>
            `;
        } else {
            renderTranscripts(transcripts);
        }
    } catch (err) {
        console.error("Error loading transcripts:", err);
        transcriptsList.innerHTML = `
            <div class="empty-state">
                <p>Ошибка загрузки транскрипций</p>
                <p class="hint">${err.message}</p>
            </div>
        `;
    }
}

function renderTranscripts(transcripts) {
    const html = transcripts.map(transcript => {
        const statusBadge = getStatusBadge(transcript.status, transcript.progress, transcript.status_message);
        const actions = getActionsForStatus(transcript);
        const statusMsg = transcript.status_message || '';
        
        // Получаем имя папки
        const folder = transcript.folder_id ? allFolders.find(f => f.id === transcript.folder_id) : null;
        const folderBadge = folder 
            ? `<span class="folder-badge" title="Папка: ${escapeHtml(folder.name)}">📂 ${escapeHtml(folder.name)}</span>` 
            : '';
        
        return `
        <div class="transcript-item" data-file-id="${transcript.id}">
            <div class="transcript-info">
                <div class="transcript-header">
                    <h3>${escapeHtml(transcript.filename)}</h3>
                    ${folderBadge}
                    ${statusBadge}
                </div>
                ${transcript.status === 'processing' || transcript.status === 'pending' ? 
                    `<div class="progress-section">
                        <div class="progress-indicator">
                        <div class="progress-bar-small" style="width: ${transcript.progress}%"></div>
                        </div>
                        <p class="status-message">${escapeHtml(statusMsg)}</p>
                    </div>` : ''
                }
                ${transcript.status === 'completed' ? 
                    `<p class="transcript-preview">${escapeHtml(transcript.preview || "")}</p>` : ''
                }
                ${transcript.status === 'failed' ? 
                    `<p class="error-message">Ошибка: ${escapeHtml(transcript.error_message || "Неизвестная ошибка")}</p>` : ''
                }
                <p class="transcript-meta">
                    Модель: ${transcript.model} | 
                    ${transcript.status === 'completed' ? `Размер: ${formatSize(transcript.size)} | ` : ''}
                    ${transcript.created_at ? `Создано: ${formatDate(transcript.created_at)}` : ''}
                </p>
            </div>
            <div class="transcript-actions">
                ${actions}
            </div>
        </div>
        `;
    }).join("");
    
    transcriptsList.innerHTML = html;
    
    // Запускаем отслеживание для активных задач
    transcripts.forEach(t => {
        if (t.status === 'pending' || t.status === 'processing') {
            trackProcessingStatus(t.id);
        }
    });
}

function getStatusBadge(status, progress, statusMessage) {
    const pendingText = typeof t === 'function' ? t('status.pending') : 'Ожидание';
    const completedText = typeof t === 'function' ? t('status.completed') : 'Готово';
    const failedText = typeof t === 'function' ? t('status.failed') : 'Ошибка';
    
    const badges = {
        'pending': `<span class="status-badge status-pending">${pendingText}</span>`,
        'processing': `<span class="status-badge status-processing">${Math.round(progress)}%</span>`,
        'completed': `<span class="status-badge status-completed">${completedText}</span>`,
        'failed': `<span class="status-badge status-failed">${failedText}</span>`
    };
    return badges[status] || '';
}

function getActionsForStatus(transcript) {
    const renameTitle = typeof t === 'function' ? t('action.rename') : 'Переименовать';
    const deleteTitle = typeof t === 'function' ? t('action.delete') : 'Удалить';
    const moveTitle = typeof t === 'function' ? t('action.move') : 'Переместить в папку';
    const viewText = typeof t === 'function' ? t('transcripts.view') : 'Просмотр';
    const downloadText = typeof t === 'function' ? t('transcripts.download') : 'Скачать';
    const retryText = typeof t === 'function' ? t('transcripts.retry') : 'Повторить';
    const processingText = typeof t === 'function' ? t('upload.processing') : 'Обработка...';
    
    const renameBtn = `<button class="btn btn-secondary btn-small" onclick="renameTranscript('${transcript.id}', '${escapeHtml(transcript.filename || '')}')" title="${renameTitle}">✏️</button>`;
    const deleteBtn = `<button class="btn btn-danger btn-small" onclick="deleteTranscript('${transcript.id}', '${escapeHtml(transcript.filename || '')}')" title="${deleteTitle}">🗑️</button>`;
    const moveBtn = `<button class="btn btn-secondary btn-small" onclick="openMoveToFolderModal('${transcript.id}', '${escapeHtml(transcript.filename || '')}', ${transcript.folder_id || 'null'})" title="${moveTitle}">📂</button>`;
    
    if (transcript.status === 'completed') {
        return `
            <button class="btn btn-secondary" onclick="viewTranscript('${transcript.id}')">${viewText}</button>
            <button class="btn btn-secondary" onclick="downloadTranscript('${transcript.id}')">${downloadText}</button>
            ${moveBtn}
            ${renameBtn}
            ${deleteBtn}
        `;
    } else if (transcript.status === 'failed') {
        return `
            <button class="btn btn-secondary" onclick="retryTranscript('${transcript.id}')">${retryText}</button>
            ${moveBtn}
            ${renameBtn}
            ${deleteBtn}
        `;
    } else {
        return `
            <span class="processing-text">${processingText}</span>
            ${moveBtn}
            ${renameBtn}
            ${deleteBtn}
        `;
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Отслеживание статуса обработки
const trackingIntervals = {};

function trackProcessingStatus(fileId) {
    // Если уже отслеживаем этот файл, не запускаем повторно
    if (trackingIntervals[fileId]) {
        return;
    }
    
    const checkStatus = async () => {
        try {
            if (typeof apiGetStatus !== 'function') {
                return;
            }
            
            const status = await apiGetStatus(fileId);
            
            // Обновляем элемент в списке
            const item = document.querySelector(`[data-file-id="${fileId}"]`);
            if (item) {
                const statusBadge = getStatusBadge(status.status, status.progress, status.status_message);
                const header = item.querySelector('.transcript-header');
                if (header) {
                    const h3 = header.querySelector('h3');
                    header.innerHTML = h3.outerHTML + statusBadge;
                }
                
                // Обновляем прогресс
                const progressBar = item.querySelector('.progress-bar-small');
                if (progressBar) {
                    progressBar.style.width = status.progress + '%';
                }
                
                // Обновляем сообщение статуса
                const statusMessage = item.querySelector('.status-message');
                if (statusMessage && status.status_message) {
                    statusMessage.textContent = status.status_message;
                }
                
                // Обновляем действия
                const actionsDiv = item.querySelector('.transcript-actions');
                if (actionsDiv) {
                    actionsDiv.innerHTML = getActionsForStatus(status);
                }
            }
            
            // Если обработка завершена или провалилась, останавливаем отслеживание
            if (status.status === 'completed' || status.status === 'failed') {
                clearInterval(trackingIntervals[fileId]);
                delete trackingIntervals[fileId];
                // Обновляем весь список
                loadTranscripts();
            }
        } catch (err) {
            console.error("Error checking status:", err);
        }
    };
    
    // Проверяем статус каждые 2 секунды
    trackingIntervals[fileId] = setInterval(checkStatus, 2000);
    checkStatus(); // Первая проверка сразу
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
    return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
}

// Глобальные функции для кнопок
window.viewTranscript = async function(fileId) {
    try {
        const data = await apiGetTranscript(fileId);
        // Показываем транскрипцию в модальном окне или новом окне
        const transcriptText = data.transcript || "";
        const blob = new Blob([transcriptText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');
        if (newWindow) {
            newWindow.document.write(`<pre style="padding: 20px; font-family: monospace;">${escapeHtml(transcriptText)}</pre>`);
        }
    } catch (err) {
        alert("Ошибка: " + err.message);
    }
};

window.downloadTranscript = async function(fileId) {
    try {
        const data = await apiGetTranscript(fileId);
        
        // Проверяем статус
        if (data.status && data.status !== 'completed') {
            alert("Транскрипция ещё не готова. Статус: " + data.status);
            return;
        }
        
        const transcriptText = data.transcript || "";
        const blob = new Blob([transcriptText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transcript_${fileId}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (err) {
        alert("Ошибка: " + err.message);
    }
};

window.retryTranscript = async function(fileId) {
    if (confirm("Повторить обработку этого файла?")) {
        try {
            const data = await apiRetryTranscript(fileId);
            showMessage(`Обработка перезапущена для файла ${fileId}`, "success");
            
            // Обновляем список и запускаем отслеживание
            await loadTranscripts();
            trackProcessingStatus(fileId);
        } catch (err) {
            alert("Ошибка: " + err.message);
        }
    }
};

window.renameTranscript = async function(fileId, currentName) {
    const newName = prompt("Введите новое имя файла:", currentName);
    
    if (newName === null) {
        return; // Пользователь нажал "Отмена"
    }
    
    const trimmedName = newName.trim();
    if (!trimmedName) {
        alert("Имя не может быть пустым");
        return;
    }
    
    if (trimmedName === currentName) {
        return; // Имя не изменилось
    }
    
    try {
        await apiRenameTranscript(fileId, trimmedName);
        showMessage("Файл переименован", "success");
        await loadTranscripts();
    } catch (err) {
        alert("Ошибка: " + err.message);
    }
};

window.deleteTranscript = async function(fileId, filename) {
    if (!confirm(`Удалить "${filename}"?\n\nЭто действие нельзя отменить. Будут удалены аудиофайл и транскрипция.`)) {
        return;
    }
    
    try {
        await apiDeleteTranscript(fileId);
        showMessage("Запись удалена", "success");
        await loadTranscripts();
    } catch (err) {
        alert("Ошибка: " + err.message);
    }
};

// === Функции для папок ===

async function loadFolders() {
    try {
        if (typeof apiListFolders !== 'function') return;
        
        const data = await apiListFolders();
        allFolders = data.folders || [];
        renderFolders();
    } catch (err) {
        console.error("Error loading folders:", err);
    }
}

function renderFolders() {
    const foldersList = document.getElementById('foldersList');
    if (!foldersList) return;
    
    const noFoldersText = typeof t === 'function' ? t('sidebar.noFolders') : 'Нет папок';
    
    if (allFolders.length === 0) {
        foldersList.innerHTML = `<div class="sidebar-empty">${noFoldersText}</div>`;
        return;
    }
    
    foldersList.innerHTML = allFolders.map(folder => `
        <div class="sidebar-item ${currentFilter.type === 'folder' && currentFilter.value === folder.id ? 'active' : ''}" 
             data-filter="folder" 
             data-folder-id="${folder.id}"
             onclick="filterByFolder(${folder.id})">
            <span class="sidebar-icon">📂</span>
            <span class="folder-name">${escapeHtml(folder.name)}</span>
            <span class="folder-count">${folder.count || 0}</span>
            <div class="folder-actions">
                <button class="folder-action-btn" onclick="event.stopPropagation(); renameFolder(${folder.id}, '${escapeHtml(folder.name)}')" title="Переименовать">✏️</button>
                <button class="folder-action-btn" onclick="event.stopPropagation(); deleteFolder(${folder.id}, '${escapeHtml(folder.name)}')" title="Удалить">🗑️</button>
            </div>
        </div>
    `).join('');
}

// Фильтрация
window.filterByRecent = function() {
    currentFilter = { type: 'recent', value: null };
    updateSidebarActive();
    loadTranscripts();
    if (typeof closeMobileSidebar === 'function') closeMobileSidebar();
};

window.filterByAll = function() {
    currentFilter = { type: 'all', value: null };
    updateSidebarActive();
    loadTranscripts();
    if (typeof closeMobileSidebar === 'function') closeMobileSidebar();
};

window.filterByFolder = function(folderId) {
    currentFilter = { type: 'folder', value: folderId };
    updateSidebarActive();
    loadTranscripts();
    if (typeof closeMobileSidebar === 'function') closeMobileSidebar();
};

function updateSidebarActive() {
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
        
        const filter = item.dataset.filter;
        const folderId = item.dataset.folderId ? parseInt(item.dataset.folderId) : null;
        
        if (filter === currentFilter.type) {
            if (currentFilter.type === 'folder') {
                if (folderId === currentFilter.value) {
                    item.classList.add('active');
                }
            } else {
                item.classList.add('active');
            }
        }
    });
}

// Модальное окно папки
window.openNewFolderModal = function() {
    const modal = document.getElementById('folderModal');
    const input = document.getElementById('folderName');
    if (modal) {
        modal.style.display = 'flex';
        input.value = '';
        input.focus();
    }
};

window.closeFolderModal = function() {
    const modal = document.getElementById('folderModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.createFolder = async function() {
    const input = document.getElementById('folderName');
    const name = input.value.trim();
    
    if (!name) {
        alert('Введите название папки');
        return;
    }
    
    try {
        await apiCreateFolder(name);
        closeFolderModal();
        await loadFolders();
        showMessage('Папка создана', 'success');
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
};

window.renameFolder = async function(folderId, currentName) {
    const newName = prompt('Введите новое название папки:', currentName);
    
    if (newName === null) return;
    
    const trimmedName = newName.trim();
    if (!trimmedName) {
        alert('Название не может быть пустым');
        return;
    }
    
    if (trimmedName === currentName) return;
    
    try {
        await apiRenameFolder(folderId, trimmedName);
        await loadFolders();
        showMessage('Папка переименована', 'success');
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
};

window.deleteFolder = async function(folderId, folderName) {
    if (!confirm(`Удалить папку "${folderName}"?\n\nФайлы внутри папки не будут удалены.`)) {
        return;
    }
    
    try {
        await apiDeleteFolder(folderId);
        
        // Если удаляем текущую папку, переключаемся на "все файлы"
        if (currentFilter.type === 'folder' && currentFilter.value === folderId) {
            currentFilter = { type: 'all', value: null };
        }
        
        await loadFolders();
        await loadTranscripts();
        showMessage('Папка удалена', 'success');
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
};

// Enter для создания папки
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const modal = document.getElementById('folderModal');
        if (modal && modal.style.display === 'flex') {
            createFolder();
        }
    }
    if (e.key === 'Escape') {
        closeFolderModal();
        closeMoveToFolderModal();
    }
});

// === Функции перемещения в папку ===

window.openMoveToFolderModal = function(fileId, filename, currentFolderId) {
    const modal = document.getElementById('moveToFolderModal');
    const fileIdInput = document.getElementById('moveFileId');
    const fileNameLabel = document.getElementById('moveFileName');
    const folderList = document.getElementById('folderSelectList');
    
    if (!modal) return;
    
    const noFolderText = typeof t === 'function' ? t('modal.noFolder') : 'Без папки';
    const noFoldersText = typeof t === 'function' ? t('sidebar.noFolders') : 'Нет папок';
    const createFolderText = typeof t === 'function' ? t('modal.createFolderBtn') : 'Создать папку';
    
    fileIdInput.value = fileId;
    fileNameLabel.textContent = `${filename}`;
    
    // Генерируем список папок
    let html = `
        <div class="folder-select-item ${currentFolderId === null ? 'active' : ''}" 
             onclick="moveToFolder('${fileId}', null)">
            <span class="folder-select-icon">📄</span>
            <span>${noFolderText}</span>
            ${currentFolderId === null ? '<span class="folder-select-check">✓</span>' : ''}
        </div>
    `;
    
    allFolders.forEach(folder => {
        const isActive = currentFolderId === folder.id;
        html += `
            <div class="folder-select-item ${isActive ? 'active' : ''}" 
                 onclick="moveToFolder('${fileId}', ${folder.id})">
                <span class="folder-select-icon">📂</span>
                <span>${escapeHtml(folder.name)}</span>
                ${isActive ? '<span class="folder-select-check">✓</span>' : ''}
            </div>
        `;
    });
    
    if (allFolders.length === 0) {
        html += `
            <div class="folder-select-empty">
                <p>${noFoldersText}</p>
                <button class="btn btn-secondary" onclick="closeMoveToFolderModal(); openNewFolderModal();">
                    ${createFolderText}
                </button>
            </div>
        `;
    }
    
    folderList.innerHTML = html;
    modal.style.display = 'flex';
};

window.closeMoveToFolderModal = function() {
    const modal = document.getElementById('moveToFolderModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.moveToFolder = async function(fileId, folderId) {
    try {
        await apiMoveToFolder(fileId, folderId);
        closeMoveToFolderModal();
        
        const folderName = folderId 
            ? allFolders.find(f => f.id === folderId)?.name || 'папку'
            : 'корень';
        showMessage(`Файл перемещён в ${folderName}`, 'success');
        
        await loadFolders();
        await loadTranscripts();
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
};

