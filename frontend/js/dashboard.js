// Элементы DOM
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("audioFile");
const modelSelect = document.getElementById("modelSelect"); // Hidden input for compatibility
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
    console.log('initDashboard called');
    if (!checkAuth()) {
        console.log('Auth check failed, redirecting to login');
        return;
    }
    
    if (!transcriptsList) {
        console.error('transcriptsList element not found!');
        return;
    }
    
    setupFileUpload();
    
    // Показываем индикатор загрузки
    transcriptsList.innerHTML = `
        <div class="empty-state">
            <div class="loading-spinner"></div>
            <p>Инициализация...</p>
        </div>
    `;
    
    // Ждём загрузки api.js перед вызовом функций
    const checkApiLoaded = setInterval(() => {
        if (typeof apiListTranscripts === 'function' && typeof apiUploadAudio === 'function') {
            clearInterval(checkApiLoaded);
            console.log("API functions loaded, starting data load...");
            loadFolders().catch(err => console.error("Error loading folders:", err));
            loadTranscripts().catch(err => console.error("Error loading transcripts:", err));
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
                    <button class="btn btn-secondary" onclick="location.reload()" style="margin-top: 10px;">Обновить страницу</button>
                </div>
            `;
        }
    }, 3000);
}

// Запускаем инициализацию после полной загрузки страницы
console.log('Dashboard script loaded, readyState:', document.readyState);
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOMContentLoaded fired');
        initDashboard();
    });
} else {
    // Если DOM уже загружен, используем window.onload для гарантии загрузки всех скриптов
    console.log('DOM already loaded, waiting for window.onload');
    window.addEventListener('load', () => {
        console.log('window.onload fired');
        initDashboard();
    });
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

// Переменные для хранения данных о загрузке дубликата
let pendingUploadData = null;

// Загрузка и транскрипция
uploadBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];
    const model = modelSelect.value;
    const languageSelect = document.getElementById('languageSelect');
    const language = languageSelect ? languageSelect.value : 'auto';
    const speakerRecognitionCheckbox = document.getElementById('speakerRecognition');
    const speakerRecognition = speakerRecognitionCheckbox ? speakerRecognitionCheckbox.checked : false;

    if (!file) {
        showMessage("Выберите файл для загрузки", "error");
        return;
    }

    // Проверяем дубликаты перед загрузкой
    try {
        const duplicateCheck = await apiCheckDuplicate(file.name);
        
        if (duplicateCheck.has_duplicates && duplicateCheck.similar_files.length > 0) {
            // Сохраняем данные для загрузки после подтверждения
            pendingUploadData = { file, model, language, speakerRecognition };
            
            // Показываем модальное окно с дубликатами
            openDuplicateModal(file.name, duplicateCheck.similar_files);
            return;
        }
    } catch (err) {
        console.warn("Ошибка при проверке дубликатов:", err);
        // Продолжаем загрузку, если проверка не удалась
    }

    // Если дубликатов нет, загружаем файл
    await performUpload(file, model, language, speakerRecognition);
});

// Функция для выполнения загрузки
async function performUpload(file, model, language, speakerRecognition = false) {
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
        const data = await apiUploadAudio(file, model, language, speakerRecognition);
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
        updateProgress(0, "Ошибка", err.message);
        uploadBtn.disabled = false;
        uploadBtnText.textContent = "Загрузить и транскрибировать";
        if (typeof hideProgressSteps === 'function') {
            hideProgressSteps();
        }
    }
}

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
        // Показываем индикатор загрузки
        transcriptsList.innerHTML = `
            <div class="empty-state">
                <div class="loading-spinner"></div>
                <p>Загрузка транскрипций...</p>
            </div>
        `;
        
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
        
        // Update cache for search/filter/sort
        if (typeof updateTranscriptsCache === 'function') {
            updateTranscriptsCache(transcripts);
        } else {
            // Fallback: store in global cache
            window.allTranscriptsCache = transcripts || [];
        }
        
        // Always try to apply filters first if function exists
        if (typeof applySearchAndFilters === 'function') {
            // Apply filters will render
            applySearchAndFilters();
        } else {
            // If no filtering functions, render directly
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
        }
    } catch (err) {
        console.error("Error loading transcripts:", err);
        
        // Более детальная обработка ошибок подключения
        let errorMessage = err.message;
        let errorHint = '';
        
        if (errorMessage.includes('подключения к серверу') || errorMessage.includes('fetch')) {
            errorHint = `
                <div style="margin-top: 10px; padding: 10px; background: #fee2e2; border-radius: 6px; text-align: left;">
                    <strong>Сервер не доступен</strong><br>
                    <small>1. Убедитесь, что сервер запущен:<br>
                    <code style="background: white; padding: 2px 4px; border-radius: 3px;">cd backend && uvicorn app.main:app --reload</code><br><br>
                    2. Проверьте, что сервер работает на порту 8000<br>
                    3. Обновите страницу после запуска сервера</small>
                </div>
            `;
        }
        
        transcriptsList.innerHTML = `
            <div class="empty-state">
                <p>Ошибка загрузки транскрипций</p>
                <p class="hint">${escapeHtml(errorMessage)}</p>
                ${errorHint}
                <button class="btn btn-secondary" onclick="loadTranscripts()" style="margin-top: 10px;">Повторить</button>
            </div>
        `;
    }
}

window.renderTranscripts = function renderTranscripts(transcripts) {
    // Ensure transcriptsList exists
    if (!transcriptsList) {
        console.error('transcriptsList element not found');
        return;
    }
    
    // Handle empty state
    if (!transcripts || transcripts.length === 0) {
        const emptyMessage = currentFilter.type === 'folder' 
            ? 'В этой папке пока нет файлов' 
            : 'Пока нет транскрипций';
        transcriptsList.innerHTML = `
            <div class="empty-state">
                <p>${emptyMessage}</p>
                <p class="hint">Загрузите аудиофайл для начала</p>
            </div>
        `;
        return;
    }
    
    // Функция рендеринга одного элемента транскрипции
    const renderItem = (transcript) => {
        const statusBadge = getStatusBadge(transcript.status, transcript.progress, transcript.status_message);
        const actions = getActionsForStatus(transcript);
        const statusMsg = transcript.status_message || '';
        
        // Получаем имя папки
        const folder = transcript.folder_id ? allFolders.find(f => f.id === transcript.folder_id) : null;
        const folderBadge = folder 
            ? `<span class="folder-badge" title="Папка: ${escapeHtml(folder.name)}">📂 ${escapeHtml(folder.name)}</span>` 
            : '';
        
        // Get file ID (can be id or file_id)
        const fileId = transcript.id || transcript.file_id;
        
        // Get tags for this file
        const fileTags = typeof getFileTags === 'function' ? getFileTags(fileId) : [];
        const tagsHtml = fileTags.length > 0 
            ? `<div class="transcript-tags">${fileTags.map(tag => `<span class="tag-badge">${escapeHtml(tag)}</span>`).join('')}</div>`
            : '';
        
        // Favorite button
        const isFav = typeof isFavorite === 'function' ? isFavorite(fileId) : false;
        const favoriteBtn = `<button class="btn-favorite ${isFav ? 'active' : ''}" onclick="toggleFileFavorite('${fileId}')" title="${isFav ? 'Убрать из избранного' : 'Добавить в избранное'}">${isFav ? '⭐' : '☆'}</button>`;
        
        return `
        <div class="transcript-item ${isFav ? 'favorite' : ''}" data-file-id="${fileId}">
            <div class="transcript-info">
                <div class="transcript-header">
                    ${favoriteBtn}
                    <h3>${escapeHtml(transcript.filename)}</h3>
                    ${folderBadge}
                    ${statusBadge}
                </div>
                ${tagsHtml}
                ${transcript.status === 'processing' || transcript.status === 'pending' ? 
                    `<div class="progress-section">
                        <div class="progress-indicator">
                        <div class="progress-bar-small" style="width: ${transcript.progress}%"></div>
                        </div>
                        <p class="status-message">${escapeHtml(statusMsg)}</p>
                        ${transcript.created_at ? `<p class="processing-timer" data-file-id="${transcript.id}" data-start-time="${new Date(transcript.created_at).getTime()}">⏱️ ${t('processing.time')} <span class="timer-value">00:00</span></p>` : ''}
                    </div>` : ''
                }
                ${transcript.status === 'completed' && transcript.created_at && transcript.completed_at ? 
                    `<p class="processing-timer completed" data-file-id="${transcript.id}">⏱️ ${t('processing.time')} <span class="timer-value">${formatElapsedTime(Math.floor((new Date(transcript.completed_at).getTime() - new Date(transcript.created_at).getTime()) / 1000))}</span></p>` : 
                    transcript.status === 'completed' && transcript.created_at ?
                    `<p class="processing-timer completed" data-file-id="${transcript.id}">⏱️ ${t('processing.time')} <span class="timer-value">—</span></p>` : ''
                }
                ${transcript.status === 'completed' ? 
                    `<p class="transcript-preview">${escapeHtml(transcript.preview || "")}</p>` : ''
                }
                ${transcript.status === 'failed' ? 
                    `<p class="error-message">Ошибка: ${escapeHtml(transcript.error_message || "Неизвестная ошибка")}</p>` : ''
                }
                <p class="transcript-meta">
                    ${t('transcript.meta.model')}: ${transcript.model} | 
                    ${transcript.status === 'completed' ? `${t('transcript.meta.size')}: ${formatSize(transcript.size)} | ` : ''}
                    ${transcript.created_at ? `${t('transcript.meta.created')}: ${formatDate(transcript.created_at)}` : ''}
                </p>
            </div>
            <div class="transcript-actions">
                ${actions}
            </div>
        </div>
        `;
    };
    
    // Используем аккордеон для отображения транскрипций
    let html;
    if (typeof createAccordionHTML === 'function') {
        html = createAccordionHTML(transcripts, renderItem);
    } else {
        // Fallback: рендерим все элементы без аккордеона
        html = transcripts.map(renderItem).join("");
    }
    
    if (transcriptsList) {
        transcriptsList.innerHTML = html;
        
        // Инициализируем аккордеон после рендеринга
        if (typeof initAccordion === 'function') {
            // Используем requestAnimationFrame для инициализации после рендера
            requestAnimationFrame(() => {
                initAccordion();
            });
        }
    } else {
        console.error('transcriptsList element not found when rendering');
        return;
    }
    
    // Запускаем отслеживание и таймеры для активных задач
    transcripts.forEach(t => {
        if (t.status === 'pending' || t.status === 'processing') {
            trackProcessingStatus(t.id);
            // Запускаем таймер, если есть информация о времени начала
            if (t.created_at) {
                const startTime = new Date(t.created_at).getTime();
                startTimer(t.id, startTime);
            }
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
    const exportTitle = typeof t === 'function' ? t('action.export') : 'Экспорт';
    const aiTitle = 'AI-анализ';
    const viewText = typeof t === 'function' ? t('transcripts.view') : 'Просмотр';
    const downloadText = typeof t === 'function' ? t('transcripts.download') : 'Скачать';
    const retryText = typeof t === 'function' ? t('transcripts.retry') : 'Повторить';
    const processingText = typeof t === 'function' ? t('upload.processing') : 'Обработка...';
    
    const renameBtn = `<button class="btn btn-secondary btn-small" onclick="renameTranscript('${transcript.id}', '${escapeHtml(transcript.filename || '')}')" title="${renameTitle}">✏️</button>`;
    const deleteBtn = `<button class="btn btn-danger btn-small" onclick="deleteTranscript('${transcript.id}', '${escapeHtml(transcript.filename || '')}')" title="${deleteTitle}">🗑️</button>`;
    const moveBtn = `<button class="btn btn-secondary btn-small" onclick="openMoveToFolderModal('${transcript.id}', '${escapeHtml(transcript.filename || '')}', ${transcript.folder_id || 'null'})" title="${moveTitle}">📂</button>`;
    const exportBtn = `<button class="btn btn-secondary btn-small" onclick="openExportModal('${transcript.id}', '${escapeHtml(transcript.filename || '')}')" title="${exportTitle}">📤</button>`;
    const aiBtn = `<button class="btn btn-primary btn-small" onclick="openAIModal('${transcript.id}', '${escapeHtml(transcript.filename || '')}')" title="${aiTitle}">🤖</button>`;
    
    if (transcript.status === 'completed') {
        return `
            <button class="btn btn-secondary" onclick="viewTranscript('${transcript.id}')">${viewText}</button>
            <button class="btn btn-secondary" onclick="downloadTranscript('${transcript.id}')">${downloadText}</button>
            ${exportBtn}
            ${aiBtn}
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
const timerIntervals = {}; // Интервалы для таймеров

// Форматирование времени в MM:SS или HH:MM:SS
function formatElapsedTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Обновление таймера для одного файла
function updateTimer(fileId, startTime) {
    const timerElement = document.querySelector(`.processing-timer[data-file-id="${fileId}"] .timer-value`);
    if (!timerElement) return;
    
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    timerElement.textContent = formatElapsedTime(elapsed);
}

// Запуск таймера для файла
function startTimer(fileId, startTime) {
    // Если таймер уже запущен, не запускаем повторно
    if (timerIntervals[fileId]) {
        return;
    }
    
    // Обновляем сразу
    updateTimer(fileId, startTime);
    
    // Обновляем каждую секунду
    timerIntervals[fileId] = setInterval(() => {
        updateTimer(fileId, startTime);
    }, 1000);
}

// Остановка таймера для файла
function stopTimer(fileId) {
    if (timerIntervals[fileId]) {
        clearInterval(timerIntervals[fileId]);
        delete timerIntervals[fileId];
    }
}

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
                
                // Запускаем таймер, если его еще нет, но есть время начала
                if ((status.status === 'processing' || status.status === 'pending') && status.created_at) {
                    const timerElement = item.querySelector('.processing-timer[data-file-id="' + fileId + '"]');
                    if (!timerElement) {
                        // Если таймера нет, добавляем его
                        const progressSection = item.querySelector('.progress-section');
                        if (progressSection) {
                            const startTime = new Date(status.created_at).getTime();
                            const timerHtml = `<p class="processing-timer" data-file-id="${fileId}" data-start-time="${startTime}">⏱️ <span class="timer-value">00:00</span></p>`;
                            progressSection.insertAdjacentHTML('beforeend', timerHtml);
                            startTimer(fileId, startTime);
                        }
                    }
                }
                
                // Обновляем действия
                const actionsDiv = item.querySelector('.transcript-actions');
                if (actionsDiv) {
                    actionsDiv.innerHTML = getActionsForStatus(status);
                }
            }
            
            // Если обработка завершена или провалилась, останавливаем отслеживание и таймер
            if (status.status === 'completed' || status.status === 'failed') {
                clearInterval(trackingIntervals[fileId]);
                delete trackingIntervals[fileId];
                stopTimer(fileId);
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
        
        if (data.status && data.status !== 'completed') {
            alert("Транскрипция ещё не готова. Статус: " + data.status);
            return;
        }
        
        // Открываем модальное окно с аудиоплеером
        await openTranscriptViewModal(fileId, data);
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
        if (typeof apiListFolders !== 'function') {
            console.warn("apiListFolders function not available");
            return;
        }
        
        const data = await apiListFolders();
        allFolders = data.folders || [];
        renderFolders();
    } catch (err) {
        console.error("Error loading folders:", err);
        // Не показываем ошибку пользователю, так как папки не критичны
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
    // Закрываем другие модальные окна
    closeAIModal();
    closeTranscriptViewModal();
    closeReviewModal();
    
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

// ================================
// DUPLICATE MODAL
// ================================

window.openDuplicateModal = function(filename, similarFiles) {
    const modal = document.getElementById('duplicateModal');
    const fileNameEl = document.getElementById('duplicateFileName');
    const filesListEl = document.getElementById('duplicateFilesList');
    
    if (!modal || !fileNameEl || !filesListEl) {
        // Если модальное окно не найдено, просто показываем подтверждение
        if (confirm(`Файл "${filename}" уже существует в базе. Загрузить всё равно?`)) {
            confirmDuplicateUpload();
        }
        return;
    }
    
    // Устанавливаем имя файла
    fileNameEl.textContent = filename;
    
    // Формируем список похожих файлов
    let html = '';
    if (similarFiles && similarFiles.length > 0) {
        similarFiles.forEach(file => {
            const statusClass = file.status || 'unknown';
            const statusText = {
                'completed': 'Завершён',
                'processing': 'Обрабатывается',
                'pending': 'В очереди',
                'failed': 'Ошибка'
            }[statusClass] || 'Неизвестно';
            
            const date = file.created_at ? new Date(file.created_at).toLocaleDateString() : 'Неизвестно';
            const similarity = Math.round((file.similarity || 0) * 100);
            
            html += `
                <div class="duplicate-file-item">
                    <div class="duplicate-file-name">${escapeHtml(file.filename)}</div>
                    <div class="duplicate-file-meta">
                        <span class="duplicate-file-status ${statusClass}">${statusText}</span>
                        <span class="duplicate-similarity">Схожесть: ${similarity}%</span>
                        <span>${date}</span>
                    </div>
                </div>
            `;
        });
    } else {
        html = '<div class="duplicate-file-item"><p>Похожие файлы не найдены</p></div>';
    }
    
    filesListEl.innerHTML = html;
    modal.style.display = 'flex';
};

window.closeDuplicateModal = function() {
    const modal = document.getElementById('duplicateModal');
    if (modal) {
        modal.style.display = 'none';
    }
    // Очищаем данные о загрузке
    pendingUploadData = null;
};

window.confirmDuplicateUpload = async function() {
    if (!pendingUploadData) {
        closeDuplicateModal();
        return;
    }
    
    const { file, model, language, speakerRecognition } = pendingUploadData;
    pendingUploadData = null;
    
    closeDuplicateModal();
    
    // Выполняем загрузку
    await performUpload(file, model, language, speakerRecognition || false);
};

// ================================
// EXPORT MODAL
// ================================

window.openExportModal = function(fileId, filename) {
    const modal = document.getElementById('exportModal');
    const fileIdInput = document.getElementById('exportFileId');
    const fileNameLabel = document.getElementById('exportFileName');
    
    if (!modal || !fileIdInput || !fileNameLabel) return;
    
    fileIdInput.value = fileId;
    fileNameLabel.textContent = filename;
    modal.style.display = 'flex';
};

window.closeExportModal = function() {
    const modal = document.getElementById('exportModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.exportAs = async function(format) {
    const fileId = document.getElementById('exportFileId')?.value;
    if (!fileId) return;
    
    closeExportModal();
    
    const formatNames = {
        'docx': 'DOCX',
        'xlsx': 'XLSX', 
        'srt': 'SRT',
        'txt': 'TXT'
    };
    
    showMessage(`Экспорт в ${formatNames[format] || format}...`, 'success');
    
    try {
        // Используем API функцию для экспорта
        if (typeof apiExportTranscript === 'function') {
            await apiExportTranscript(fileId, format);
        } else {
            // Fallback - прямая загрузка через fetch
            const url = `${window.location.origin}/export/${format}/${fileId}`;
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `transcript.${format}`;
            link.click();
            window.URL.revokeObjectURL(downloadUrl);
        }
    } catch (err) {
        showMessage('Ошибка экспорта: ' + err.message, 'error');
    }
};

// FAQ Accordion
window.toggleFaq = function(element) {
    const faqItem = element.closest('.faq-item');
    const isActive = faqItem.classList.contains('active');
    
    // Close all other FAQ items
    document.querySelectorAll('.faq-item.active').forEach(item => {
        if (item !== faqItem) {
            item.classList.remove('active');
        }
    });
    
    // Toggle current item
    faqItem.classList.toggle('active', !isActive);
};

// Reviews functionality
window.openReviewModal = function() {
    // Закрываем другие модальные окна
    closeAIModal();
    closeTranscriptViewModal();
    closeFolderModal();
    
    const modal = document.getElementById('reviewModal');
    modal.style.display = 'flex';
    
    // Reset form
    document.getElementById('reviewAuthor').value = '';
    document.getElementById('reviewText').value = '';
    document.getElementById('reviewRating').value = '5';
    
    // Reset stars
    updateStarDisplay(5);
    
    // Initialize star rating clicks
    initStarRating();
};

window.closeReviewModal = function() {
    const modal = document.getElementById('reviewModal');
    modal.style.display = 'none';
};

function initStarRating() {
    const stars = document.querySelectorAll('#starRating .star-btn');
    stars.forEach(star => {
        star.onclick = function() {
            const rating = parseInt(this.dataset.rating);
            document.getElementById('reviewRating').value = rating;
            updateStarDisplay(rating);
        };
    });
}

function updateStarDisplay(rating) {
    const stars = document.querySelectorAll('#starRating .star-btn');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

window.submitReview = function() {
    const author = document.getElementById('reviewAuthor').value.trim();
    const text = document.getElementById('reviewText').value.trim();
    const rating = parseInt(document.getElementById('reviewRating').value);
    
    if (!author) {
        showMessage('Пожалуйста, укажите ваше имя', 'error');
        return;
    }
    
    if (!text || text.length < 10) {
        showMessage('Отзыв должен содержать минимум 10 символов', 'error');
        return;
    }
    
    // Add review to the grid
    addReviewToGrid(author, text, rating);
    
    // Close modal and show success
    closeReviewModal();
    showMessage('Спасибо за ваш отзыв!', 'success');
};

function addReviewToGrid(author, text, rating) {
    const reviewsGrid = document.getElementById('reviewsList');
    
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    
    const reviewCard = document.createElement('div');
    reviewCard.className = 'review-card';
    reviewCard.innerHTML = `
        <div class="review-quote">
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
            </svg>
        </div>
        <p class="review-text">${escapeHtml(text)}</p>
        <div class="review-rating">
            ${stars.split('').map(s => `<span class="star">${s}</span>`).join('')}
        </div>
        <div class="review-author">${escapeHtml(author)}</div>
    `;
    
    // Add to the beginning
    reviewsGrid.insertBefore(reviewCard, reviewsGrid.firstChild);
    
    // Animate
    reviewCard.style.opacity = '0';
    reviewCard.style.transform = 'translateY(-20px)';
    setTimeout(() => {
        reviewCard.style.transition = 'all 0.3s ease';
        reviewCard.style.opacity = '1';
        reviewCard.style.transform = 'translateY(0)';
    }, 10);
}

// === AI Modal Functions ===

window.openAIModal = async function(fileId, filename) {
    // Закрываем другие модальные окна
    closeTranscriptViewModal();
    closeFolderModal();
    closeReviewModal();
    
    const modal = document.getElementById('aiModal');
    const modalContent = modal.querySelector('.ai-modal-content');
    
    // Устанавливаем fileId
    modal.dataset.fileId = fileId;
    document.getElementById('aiFileName').textContent = filename || 'Транскрипция';
    
    // Показываем модальное окно
    modal.style.display = 'flex';
    
    // Загружаем существующие AI-данные
    await loadAIData(fileId);
};

window.closeAIModal = function() {
    const modal = document.getElementById('aiModal');
    modal.style.display = 'none';
};

async function loadAIData(fileId) {
    const loadingDiv = document.getElementById('aiLoading');
    const contentDiv = document.getElementById('aiContent');
    const errorDiv = document.getElementById('aiError');
    
    // Показываем загрузку
    loadingDiv.style.display = 'block';
    contentDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    
    try {
        if (typeof apiGetAIData !== 'function') {
            throw new Error('API функция не загружена');
        }
        
        const data = await apiGetAIData(fileId);
        
        // Скрываем загрузку, показываем контент
        loadingDiv.style.display = 'none';
        contentDiv.style.display = 'block';
        
        // Обновляем данные
        updateAIDisplay(data);
    } catch (err) {
        console.error('Error loading AI data:', err);
        loadingDiv.style.display = 'none';
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'Ошибка загрузки: ' + err.message;
    }
}

function updateAIDisplay(data) {
    // Резюме
    const summaryDiv = document.getElementById('aiSummary');
    if (data.summary) {
        summaryDiv.innerHTML = `
            <div class="ai-section-content">
                <p>${escapeHtml(data.summary)}</p>
                ${data.summary_created_at ? `<small class="ai-timestamp">Создано: ${formatDate(data.summary_created_at)}</small>` : ''}
            </div>
        `;
    } else {
        summaryDiv.innerHTML = '<div class="ai-section-empty">Резюме ещё не создано</div>';
    }
    
    // Ключевые слова
    const keywordsDiv = document.getElementById('aiKeywords');
    if (data.keywords && data.keywords.length > 0) {
        const keywordsHtml = data.keywords.map(kw => `<span class="keyword-tag">${escapeHtml(kw)}</span>`).join('');
        keywordsDiv.innerHTML = `
            <div class="ai-section-content">
                <div class="keywords-list">${keywordsHtml}</div>
                ${data.keywords_created_at ? `<small class="ai-timestamp">Создано: ${formatDate(data.keywords_created_at)}</small>` : ''}
            </div>
        `;
    } else {
        keywordsDiv.innerHTML = '<div class="ai-section-empty">Ключевые слова ещё не извлечены</div>';
    }
    
    // Sentiment
    const sentimentDiv = document.getElementById('aiSentiment');
    if (data.sentiment) {
        const sentiment = data.sentiment;
        const sentimentClass = sentiment.sentiment === 'positive' ? 'sentiment-positive' : 
                              sentiment.sentiment === 'negative' ? 'sentiment-negative' : 'sentiment-neutral';
        const sentimentEmoji = sentiment.sentiment === 'positive' ? '😊' : 
                               sentiment.sentiment === 'negative' ? '😞' : '😐';
        sentimentDiv.innerHTML = `
            <div class="ai-section-content">
                <div class="sentiment-display ${sentimentClass}">
                    <span class="sentiment-emoji">${sentimentEmoji}</span>
                    <span class="sentiment-label">${sentiment.sentiment === 'positive' ? 'Позитивная' : 
                                                   sentiment.sentiment === 'negative' ? 'Негативная' : 'Нейтральная'}</span>
                    <span class="sentiment-score">${(sentiment.score * 100).toFixed(0)}%</span>
                </div>
                ${data.sentiment_created_at ? `<small class="ai-timestamp">Создано: ${formatDate(data.sentiment_created_at)}</small>` : ''}
            </div>
        `;
    } else {
        sentimentDiv.innerHTML = '<div class="ai-section-empty">Тональность ещё не проанализирована</div>';
    }
    
    // Категория
    const categoryDiv = document.getElementById('aiCategory');
    if (data.category) {
        categoryDiv.innerHTML = `
            <div class="ai-section-content">
                <div class="category-display">
                    <span class="category-label">${escapeHtml(data.category)}</span>
                    ${data.category_confidence ? `<span class="category-confidence">${(data.category_confidence * 100).toFixed(0)}%</span>` : ''}
                </div>
                ${data.category_created_at ? `<small class="ai-timestamp">Создано: ${formatDate(data.category_created_at)}</small>` : ''}
            </div>
        `;
    } else {
        categoryDiv.innerHTML = '<div class="ai-section-empty">Категория ещё не определена</div>';
    }
    
    // Переводы
    const translationsDiv = document.getElementById('aiTranslations');
    if (data.translations && Object.keys(data.translations).length > 0) {
        const translationsHtml = Object.entries(data.translations).map(([lang, trans]) => {
            return `
                <div class="translation-item">
                    <div class="translation-header">
                        <strong>${lang.toUpperCase()}</strong>
                        ${trans.created_at ? `<small>${formatDate(trans.created_at)}</small>` : ''}
                    </div>
                    <p class="translation-text">${escapeHtml(trans.text)}</p>
                </div>
            `;
        }).join('');
        translationsDiv.innerHTML = `<div class="ai-section-content">${translationsHtml}</div>`;
    } else {
        translationsDiv.innerHTML = '<div class="ai-section-empty">Переводы ещё не созданы</div>';
    }
}

// AI Actions
window.generateSummary = async function() {
    const fileId = document.getElementById('aiModal').dataset.fileId;
    if (!fileId) return;
    
    const btn = event.target;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Создание...';
    
    try {
        await apiGenerateSummary(fileId);
        showMessage('Резюме создано!', 'success');
        await loadAIData(fileId);
    } catch (err) {
        showMessage('Ошибка: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
};

window.extractKeywords = async function() {
    const fileId = document.getElementById('aiModal').dataset.fileId;
    if (!fileId) return;
    
    const btn = event.target;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Извлечение...';
    
    try {
        await apiExtractKeywords(fileId);
        showMessage('Ключевые слова извлечены!', 'success');
        await loadAIData(fileId);
    } catch (err) {
        showMessage('Ошибка: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
};

window.analyzeSentiment = async function() {
    const fileId = document.getElementById('aiModal').dataset.fileId;
    if (!fileId) return;
    
    const btn = event.target;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Анализ...';
    
    try {
        await apiAnalyzeSentiment(fileId);
        showMessage('Тональность проанализирована!', 'success');
        await loadAIData(fileId);
    } catch (err) {
        showMessage('Ошибка: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
};

window.classifyTranscript = async function() {
    const fileId = document.getElementById('aiModal').dataset.fileId;
    if (!fileId) return;
    
    const btn = event.target;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Классификация...';
    
    try {
        await apiClassifyTranscript(fileId);
        showMessage('Категория определена!', 'success');
        await loadAIData(fileId);
    } catch (err) {
        showMessage('Ошибка: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
};

window.analyzeAllAI = async function() {
    const fileId = document.getElementById('aiModal').dataset.fileId;
    if (!fileId) return;
    
    const btn = event.target;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Анализ...';
    
    try {
        await apiAnalyzeAll(fileId);
        showMessage('Все анализы выполнены!', 'success');
        await loadAIData(fileId);
    } catch (err) {
        showMessage('Ошибка: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
};

window.translateTranscript = async function() {
    const fileId = document.getElementById('aiModal').dataset.fileId;
    if (!fileId) return;
    
    const targetLang = prompt('Введите код языка (например: en, de, fr):', 'en');
    if (!targetLang) return;
    
    const btn = event.target;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Перевод...';
    
    try {
        await apiTranslateTranscript(fileId, targetLang);
        showMessage('Перевод выполнен!', 'success');
        await loadAIData(fileId);
    } catch (err) {
        showMessage('Ошибка: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
};

// ================================
// AUDIO PLAYER WITH TRANSCRIPT SYNC
// ================================

let transcriptSegments = [];
let currentSegmentIndex = -1;
let audioPlayer = null;
let transcriptViewFileId = null;
let translationEnabled = false;
let translationLanguage = 'ru';
let segmentTranslations = {}; // Кэш переводов: {segmentIndex: {language: translatedText}}

// Парсинг транскрипции на сегменты
function parseTranscriptSegments(text) {
    const segments = [];
    const lines = text.trim().split('\n');
    
    // Pattern: поддерживает разные форматы:
    // [00:00:00 --> 00:00:05]  Text here
    // [00:00:00 -> 00:00:05]  Text here  
    // [00:00:00 → 00:00:05]  Text here
    // [00:00:00.000 → 00:00:05.000]  Text here
    const pattern = /\[(\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\s*(?:--?>|→)\s*(\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\]\s*(.+)/;
    
    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return; // Пропускаем пустые строки
        
        const match = trimmedLine.match(pattern);
        if (match) {
            const startTime = match[1];
            const endTime = match[2];
            const textContent = match[3].trim();
            
            // Конвертируем время в секунды
            const startSeconds = timeToSeconds(startTime);
            const endSeconds = timeToSeconds(endTime);
            
            segments.push({
                index: segments.length,
                start: startTime,
                end: endTime,
                startSeconds: startSeconds,
                endSeconds: endSeconds,
                text: textContent,
                element: null
            });
        } else if (trimmedLine) {
            // Текст без таймкода
            segments.push({
                index: segments.length,
                start: null,
                end: null,
                startSeconds: null,
                endSeconds: null,
                text: trimmedLine,
                element: null
            });
        }
    });
    
    return segments;
}

// Конвертация времени в секунды
function timeToSeconds(timeStr) {
    if (!timeStr) return 0;
    
    // Убираем миллисекунды если есть
    const timeWithoutMs = timeStr.split('.')[0];
    const parts = timeWithoutMs.split(':');
    
    if (parts.length !== 3) return 0;
    
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseInt(parts[2]) || 0;
    
    return hours * 3600 + minutes * 60 + seconds;
}

// Форматирование секунд в MM:SS
function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Открытие модального окна просмотра транскрипции
window.openTranscriptViewModal = async function(fileId, transcriptData) {
    // Закрываем другие модальные окна
    closeAIModal();
    closeFolderModal();
    closeReviewModal();
    
    const modal = document.getElementById('transcriptViewModal');
    const titleEl = document.getElementById('transcriptViewTitle');
    const audioEl = document.getElementById('transcriptAudio');
    const textContainer = document.getElementById('transcriptText');
    
    if (!modal || !audioEl || !textContainer) return;
    
    transcriptViewFileId = fileId;
    audioPlayer = audioEl;
    
    // Получаем данные транскрипции
    let transcriptText = '';
    let filename = 'Транскрипция';
    
    if (transcriptData && transcriptData.transcript) {
        transcriptText = transcriptData.transcript;
        filename = transcriptData.filename || filename;
    } else {
        try {
            const data = await apiGetTranscript(fileId);
            transcriptText = data.transcript || '';
            filename = data.filename || filename;
        } catch (err) {
            alert('Ошибка загрузки транскрипции: ' + err.message);
            return;
        }
    }
    
    // Устанавливаем заголовок
    if (titleEl) {
        titleEl.textContent = filename;
    }
    
    // Парсим сегменты
    transcriptSegments = parseTranscriptSegments(transcriptText);
    
    // Initialize history for undo/redo
    if (typeof initializeHistory === 'function') {
        initializeHistory();
    }
    
    // Рендерим сегменты
    renderTranscriptSegments();
    
    // Загружаем и применяем закладку, если она есть
    loadAndApplyBookmark(fileId);
    
    // Загружаем аудио
    const audioUrl = getAudioUrl(fileId);
    console.log('Loading audio from:', audioUrl);
    audioEl.src = audioUrl;
    
    // Обработка ошибок загрузки аудио
    audioEl.addEventListener('error', (e) => {
        console.error('Audio load error:', e);
        const errorCode = audioEl.error;
        let errorMsg = 'Ошибка загрузки аудиофайла';
        
        if (errorCode) {
            switch (errorCode.code) {
                case errorCode.MEDIA_ERR_ABORTED:
                    errorMsg = 'Загрузка аудио прервана';
                    break;
                case errorCode.MEDIA_ERR_NETWORK:
                    errorMsg = 'Ошибка сети при загрузке аудио';
                    break;
                case errorCode.MEDIA_ERR_DECODE:
                    errorMsg = 'Ошибка декодирования аудио';
                    break;
                case errorCode.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    errorMsg = 'Формат аудио не поддерживается';
                    break;
            }
        }
        
        alert(errorMsg + '\n\nПроверьте, что аудиофайл существует и доступен.');
    });
    
    // Инициализируем плеер
    initAudioPlayer();
    
    // Показываем модальное окно
    modal.style.display = 'flex';
    
    // Загружаем метаданные аудио
    audioEl.addEventListener('loadedmetadata', () => {
        const totalTimeEl = document.getElementById('totalTime');
        if (totalTimeEl && audioEl.duration) {
            totalTimeEl.textContent = formatTime(audioEl.duration);
        }
    });
    
    // Обработка успешной загрузки
    audioEl.addEventListener('canplay', () => {
        console.log('Audio can play');
    });
};

window.closeTranscriptViewModal = function() {
    const modal = document.getElementById('transcriptViewModal');
    if (modal) {
        modal.style.display = 'none';
        
        // Останавливаем воспроизведение
        if (audioPlayer) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
        }
        
        // Сбрасываем состояние
        transcriptSegments = [];
        currentSegmentIndex = -1;
        audioPlayer = null;
        transcriptViewFileId = null;
        translationEnabled = false;
        translationLanguage = 'ru';
        segmentTranslations = {};
        
        // Сбрасываем UI
        const translationCheckbox = document.getElementById('enableTranslation');
        const languageSelect = document.getElementById('translationLanguage');
        if (translationCheckbox) translationCheckbox.checked = false;
        if (languageSelect) {
            languageSelect.disabled = true;
            languageSelect.value = 'ru';
        }
    }
};

// Рендеринг сегментов транскрипции
function renderTranscriptSegments() {
    const container = document.getElementById('transcriptText');
    if (!container) return;
    
    // Получаем закладку для текущего файла
    const bookmarkSegmentIndex = getBookmarkSegmentIndex(transcriptViewFileId);
    
    const html = transcriptSegments.map((seg, index) => {
        const timeDisplay = seg.start && seg.end 
            ? `<span class="segment-time" data-start="${seg.startSeconds}" data-end="${seg.endSeconds}">[${seg.start} → ${seg.end}]</span>`
            : '';
        
        // Проверяем, есть ли закладка на этом сегменте
        const isBookmarked = bookmarkSegmentIndex === index;
        const bookmarkIcon = isBookmarked ? '<span class="bookmark-icon" title="Закладка">🔖</span>' : '';
        
        // Получаем перевод, если включен
        let translationHtml = '';
        if (translationEnabled && seg.text) {
            const translation = getSegmentTranslation(index, translationLanguage);
            if (translation) {
                translationHtml = `<div class="segment-translation">${escapeHtml(translation)}</div>`;
            } else {
                // Показываем индикатор загрузки
                translationHtml = `<div class="segment-translation loading">Перевод...</div>`;
                // Запускаем перевод в фоне
                translateSegment(index, seg.text, translationLanguage);
            }
        }
        
        return `
            <div class="transcript-segment ${isBookmarked ? 'has-bookmark' : ''}" 
                 data-index="${index}" 
                 data-start="${seg.startSeconds || ''}" 
                 data-end="${seg.endSeconds || ''}">
                ${timeDisplay}
                ${bookmarkIcon}
                <div class="segment-content">
                    <div class="segment-text-wrapper">
                        <div class="segment-original" data-segment-index="${index}" contenteditable="false">${escapeHtml(seg.text)}</div>
                        <button class="segment-edit-btn" onclick="editSegment(${index}, event)" title="Редактировать">✏️</button>
                        <button class="segment-save-btn" onclick="saveSegment(${index}, event)" title="Сохранить" style="display: none;">💾</button>
                        <button class="segment-cancel-btn" onclick="cancelEditSegment(${index}, event)" title="Отменить" style="display: none;">❌</button>
                    </div>
                    ${translationHtml}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
    
    // Сохраняем ссылки на элементы
    transcriptSegments.forEach((seg, index) => {
        const element = container.querySelector(`[data-index="${index}"]`);
        if (element) {
            seg.element = element;
            // Добавляем обработчик клика для перехода к сегменту (кроме кнопок редактирования)
            element.addEventListener('click', (e) => {
                // Проверяем, не кликнули ли на кнопки редактирования
                const clickedButton = e.target.closest('.segment-edit-btn, .segment-save-btn, .segment-cancel-btn');
                if (clickedButton) {
                    return; // Не обрабатываем клик на кнопки
                }
                
                // Проверяем, не редактируется ли текст в данный момент
                const textElement = element.querySelector('.segment-original');
                const isEditing = textElement && (textElement.isContentEditable || textElement.contentEditable === 'true');
                if (isEditing) {
                    return; // Не обрабатываем клик во время редактирования
                }
                
                // Во всех остальных случаях переходим к сегменту
                e.stopPropagation();
                seekToSegment(index);
            });
        }
    });
    
    // Обновляем состояние кнопки закладки
    updateBookmarkButton();
}

// Получить перевод сегмента из кэша
function getSegmentTranslation(segmentIndex, language) {
    if (!segmentTranslations[segmentIndex]) {
        return null;
    }
    return segmentTranslations[segmentIndex][language] || null;
}

// Перевести сегмент
async function translateSegment(segmentIndex, text, targetLanguage) {
    // Проверяем кэш
    if (segmentTranslations[segmentIndex] && segmentTranslations[segmentIndex][targetLanguage]) {
        return segmentTranslations[segmentIndex][targetLanguage];
    }
    
    // Если текст пустой или слишком короткий, не переводим
    if (!text || text.trim().length < 3) {
        return null;
    }
    
    try {
        // Используем API для перевода
        const translated = await translateTextSimple(text, targetLanguage);
        
        // Сохраняем в кэш
        if (!segmentTranslations[segmentIndex]) {
            segmentTranslations[segmentIndex] = {};
        }
        segmentTranslations[segmentIndex][targetLanguage] = translated;
        
        // Обновляем отображение этого сегмента
        updateSegmentTranslation(segmentIndex, translated);
        
        return translated;
    } catch (err) {
        console.error(`Error translating segment ${segmentIndex}:`, err);
        // Показываем ошибку с более понятным сообщением
        const errorMsg = err.message || 'Ошибка перевода';
        updateSegmentTranslation(segmentIndex, null, true, errorMsg);
        return null;
    }
}

// Пакетный перевод всех сегментов (оптимизация)
async function translateAllSegments(targetLanguage) {
    const segmentsToTranslate = transcriptSegments
        .map((seg, index) => ({ index, text: seg.text }))
        .filter(item => item.text && item.text.trim().length >= 3)
        .filter(item => !segmentTranslations[item.index] || !segmentTranslations[item.index][targetLanguage]);
    
    if (segmentsToTranslate.length === 0) {
        return; // Все уже переведены
    }
    
    // Переводим по 2 сегмента за раз (уменьшено для избежания перегрузки)
    const batchSize = 2;
    const delayBetweenBatches = 300; // Увеличена задержка между батчами
    
    for (let i = 0; i < segmentsToTranslate.length; i += batchSize) {
        const batch = segmentsToTranslate.slice(i, i + batchSize);
        
        // Переводим последовательно внутри батча (не параллельно)
        for (const item of batch) {
            await translateSegment(item.index, item.text, targetLanguage);
            // Небольшая задержка между запросами
            await new Promise(resolve => setTimeout(resolve, 150));
        }
        
        // Задержка между батчами
        if (i + batchSize < segmentsToTranslate.length) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
    }
}

// Простой перевод текста через наш API
async function translateTextSimple(text, targetLanguage) {
    if (!text || text.trim().length < 3) {
        return text;
    }
    
    try {
        // Используем наш API для перевода
        const API_BASE_URL = window.location.origin;
        
        // Используем safeFetch если доступен, иначе обычный fetch
        let response;
        if (typeof safeFetch !== 'undefined') {
            response = await safeFetch(`${API_BASE_URL}/ai/translate-segment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    target_language: targetLanguage
                })
            });
        } else {
            response = await fetch(`${API_BASE_URL}/ai/translate-segment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    target_language: targetLanguage
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                throw new Error(`Translation API error: ${response.status} - ${errorText}`);
            }
        }
        
        const data = await response.json();
        return data.translated_text || text;
    } catch (err) {
        console.error('Translation error:', err);
        
        // Пытаемся извлечь более детальное сообщение об ошибке
        let errorMessage = 'Не удалось выполнить перевод.';
        
        if (err.message) {
            if (err.message.includes('503') || err.message.includes('googletrans не установлен')) {
                errorMessage = 'Перевод недоступен: googletrans не установлен на сервере.';
            } else if (err.message.includes('500') || err.message.includes('лимит')) {
                errorMessage = 'Ошибка перевода: возможно, превышен лимит запросов. Попробуйте позже.';
            } else if (err.message.includes('404') || err.message.includes('подключения')) {
                errorMessage = 'Не удалось подключиться к серверу. Убедитесь, что сервер запущен.';
            } else {
                errorMessage = err.message;
            }
        }
        
        throw new Error(errorMessage);
    }
}

// Обновить отображение перевода для сегмента
function updateSegmentTranslation(segmentIndex, translation, isError = false, errorMsg = null) {
    const segment = transcriptSegments[segmentIndex];
    if (!segment || !segment.element) return;
    
    const translationDiv = segment.element.querySelector('.segment-translation');
    if (translationDiv) {
        if (isError) {
            translationDiv.className = 'segment-translation error';
            translationDiv.textContent = errorMsg || 'Ошибка перевода';
        } else if (translation) {
            translationDiv.className = 'segment-translation';
            translationDiv.textContent = translation;
        }
    }
}

// Включить/выключить перевод
window.toggleTranslation = async function() {
    const checkbox = document.getElementById('enableTranslation');
    const languageSelect = document.getElementById('translationLanguage');
    
    if (!checkbox || !languageSelect) return;
    
    translationEnabled = checkbox.checked;
    languageSelect.disabled = !translationEnabled;
    
    if (translationEnabled) {
        // Включаем перевод - сначала перерисовываем с индикаторами загрузки
        renderTranscriptSegments();
        
        // Затем переводим все сегменты в фоне
        translateAllSegments(translationLanguage).then(() => {
            // После завершения перерисовываем с переводами
            renderTranscriptSegments();
        });
    } else {
        // Выключаем - просто перерисовываем без переводов
        renderTranscriptSegments();
    }
};

// Изменить язык перевода
window.changeTranslationLanguage = async function() {
    const languageSelect = document.getElementById('translationLanguage');
    if (!languageSelect) return;
    
    const newLanguage = languageSelect.value;
    
    if (translationEnabled) {
        translationLanguage = newLanguage;
        
        // Показываем индикатор загрузки
        const container = document.getElementById('transcriptText');
        if (container) {
            container.style.opacity = '0.6';
        }
        
        // Переводим все сегменты на новый язык
        await translateAllSegments(newLanguage);
        
        // Перерисовываем с новым языком
        renderTranscriptSegments();
        
        // Убираем индикатор
        if (container) {
            container.style.opacity = '1';
        }
    }
};

// Инициализация аудиоплеера
function initAudioPlayer() {
    if (!audioPlayer) return;
    
    // Обновление прогресса
    audioPlayer.addEventListener('timeupdate', updateAudioProgress);
    
    // Обновление кнопки play/pause
    audioPlayer.addEventListener('play', () => {
        const btn = document.getElementById('playPauseBtn');
        if (btn) btn.textContent = '⏸️';
    });
    
    audioPlayer.addEventListener('pause', () => {
        const btn = document.getElementById('playPauseBtn');
        if (btn) btn.textContent = '▶️';
    });
    
    // Синхронизация с сегментами
    audioPlayer.addEventListener('timeupdate', syncTranscriptWithAudio);
}

// Обновление прогресса аудио
function updateAudioProgress() {
    if (!audioPlayer) return;
    
    const progressBar = document.getElementById('audioProgress');
    const currentTimeEl = document.getElementById('currentTime');
    
    if (progressBar) {
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressBar.value = progress || 0;
    }
    
    if (currentTimeEl) {
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
    }
}

// Синхронизация транскрипции с аудио
function syncTranscriptWithAudio() {
    if (!audioPlayer || transcriptSegments.length === 0) return;
    
    const currentTime = audioPlayer.currentTime;
    
    // Находим текущий сегмент
    let newSegmentIndex = -1;
    for (let i = 0; i < transcriptSegments.length; i++) {
        const seg = transcriptSegments[i];
        if (seg.startSeconds !== null && seg.endSeconds !== null) {
            if (currentTime >= seg.startSeconds && currentTime <= seg.endSeconds) {
                newSegmentIndex = i;
                break;
            }
        }
    }
    
    // Обновляем подсветку
    if (newSegmentIndex !== currentSegmentIndex) {
        // Убираем подсветку с предыдущего сегмента
        if (currentSegmentIndex >= 0 && transcriptSegments[currentSegmentIndex]) {
            const prevSeg = transcriptSegments[currentSegmentIndex];
            if (prevSeg.element) {
                prevSeg.element.classList.remove('active');
            }
        }
        
        // Подсвечиваем новый сегмент
        if (newSegmentIndex >= 0 && transcriptSegments[newSegmentIndex]) {
            const newSeg = transcriptSegments[newSegmentIndex];
            if (newSeg.element) {
                newSeg.element.classList.add('active');
                
                // Прокручиваем к активному сегменту
                newSeg.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        
        currentSegmentIndex = newSegmentIndex;
        
        // Обновляем кнопку закладки при изменении текущего сегмента
        updateBookmarkButton();
    }
}

// Управление воспроизведением
window.togglePlayPause = function() {
    if (!audioPlayer) return;
    
    if (audioPlayer.paused) {
        audioPlayer.play();
    } else {
        audioPlayer.pause();
    }
};

// Переход к сегменту по клику
window.seekToSegment = function(index) {
    if (!audioPlayer || !transcriptSegments[index]) {
        console.warn('seekToSegment: audioPlayer or segment not found', { audioPlayer: !!audioPlayer, index, segmentsLength: transcriptSegments.length });
        return;
    }
    
    const seg = transcriptSegments[index];
    if (seg.startSeconds !== null && seg.startSeconds !== undefined) {
        audioPlayer.currentTime = seg.startSeconds;
        
        // Обновляем текущий индекс сегмента
        if (currentSegmentIndex !== index) {
            // Убираем подсветку с предыдущего сегмента
            if (currentSegmentIndex >= 0 && transcriptSegments[currentSegmentIndex]) {
                const prevSeg = transcriptSegments[currentSegmentIndex];
                if (prevSeg.element) {
                    prevSeg.element.classList.remove('active');
                }
            }
            
            // Подсвечиваем новый сегмент
            if (seg.element) {
                seg.element.classList.add('active');
            }
            
            currentSegmentIndex = index;
            updateBookmarkButton();
        }
        
        // Если аудио на паузе, запускаем
        if (audioPlayer.paused) {
            audioPlayer.play().catch(err => console.error('Error playing audio:', err));
        }
    } else {
        console.warn('seekToSegment: segment has no startSeconds', seg);
    }
};

// Перемотка аудио
window.seekAudio = function(value) {
    if (!audioPlayer) return;
    const time = (value / 100) * audioPlayer.duration;
    audioPlayer.currentTime = time;
};

// Изменение скорости воспроизведения
window.changePlaybackSpeed = function(speed) {
    if (!audioPlayer) return;
    audioPlayer.playbackRate = parseFloat(speed);
};

// Горячие клавиши для аудиоплеера
document.addEventListener('keydown', function(e) {
    const modal = document.getElementById('transcriptViewModal');
    if (!modal || modal.style.display !== 'flex') return;
    
    // Проверяем, не редактируется ли текст в данный момент
    const isEditing = e.target.isContentEditable || 
                      e.target.contentEditable === 'true' ||
                      e.target.closest('[contenteditable="true"]');
    
    // Space - пауза/воспроизведение (не работает при редактировании текста)
    if (e.code === 'Space' && 
        e.target.tagName !== 'INPUT' && 
        e.target.tagName !== 'TEXTAREA' &&
        !isEditing) {
        e.preventDefault();
        togglePlayPause();
    }
    
    // Стрелки влево/вправо - перемотка на 5 секунд (не работают при редактировании)
    if (e.code === 'ArrowLeft' && !e.shiftKey && !e.ctrlKey && !isEditing) {
        e.preventDefault();
        if (audioPlayer) {
            audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 5);
        }
    }
    
    if (e.code === 'ArrowRight' && !e.shiftKey && !e.ctrlKey && !isEditing) {
        e.preventDefault();
        if (audioPlayer) {
            audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 5);
        }
    }
    
    // Стрелки вверх/вниз - изменение скорости (не работают при редактировании)
    if (e.code === 'ArrowUp' && !e.shiftKey && !e.ctrlKey && !isEditing) {
        e.preventDefault();
        const speedSelect = document.getElementById('playbackSpeed');
        if (speedSelect) {
            const currentSpeed = parseFloat(speedSelect.value);
            const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
            const currentIndex = speeds.indexOf(currentSpeed);
            if (currentIndex < speeds.length - 1) {
                speedSelect.value = speeds[currentIndex + 1];
                changePlaybackSpeed(speeds[currentIndex + 1]);
            }
        }
    }
    
    if (e.code === 'ArrowDown' && !e.shiftKey && !e.ctrlKey && !isEditing) {
        e.preventDefault();
        const speedSelect = document.getElementById('playbackSpeed');
        if (speedSelect) {
            const currentSpeed = parseFloat(speedSelect.value);
            const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
            const currentIndex = speeds.indexOf(currentSpeed);
            if (currentIndex > 0) {
                speedSelect.value = speeds[currentIndex - 1];
                changePlaybackSpeed(speeds[currentIndex - 1]);
            }
        }
    }
    
    // Escape - закрыть модальное окно
    if (e.code === 'Escape') {
        closeTranscriptViewModal();
    }
    
    // B - установить/удалить закладку (не работает при редактировании текста)
    if (e.code === 'KeyB' && 
        !e.shiftKey && 
        !e.ctrlKey && 
        !e.altKey && 
        e.target.tagName !== 'INPUT' && 
        e.target.tagName !== 'TEXTAREA' &&
        !isEditing) {
        e.preventDefault();
        toggleBookmark();
    }
});

// ===== ФУНКЦИИ ДЛЯ РАБОТЫ С ЗАКЛАДКАМИ =====

// Получить ключ для хранения закладки в localStorage
function getBookmarkKey(fileId) {
    return `transcript_bookmark_${fileId}`;
}

// Сохранить закладку
function saveBookmark(fileId, segmentIndex) {
    if (!fileId || segmentIndex === undefined || segmentIndex < 0) return;
    
    const key = getBookmarkKey(fileId);
    localStorage.setItem(key, JSON.stringify({
        segmentIndex: segmentIndex,
        timestamp: Date.now()
    }));
    
    console.log(`Bookmark saved for file ${fileId} at segment ${segmentIndex}`);
}

// Получить индекс сегмента закладки
function getBookmarkSegmentIndex(fileId) {
    if (!fileId) return -1;
    
    const key = getBookmarkKey(fileId);
    const bookmarkData = localStorage.getItem(key);
    
    if (!bookmarkData) return -1;
    
    try {
        const bookmark = JSON.parse(bookmarkData);
        return bookmark.segmentIndex !== undefined ? bookmark.segmentIndex : -1;
    } catch (e) {
        console.error('Error parsing bookmark:', e);
        return -1;
    }
}

// Удалить закладку
function removeBookmark(fileId) {
    if (!fileId) return;
    
    const key = getBookmarkKey(fileId);
    localStorage.removeItem(key);
    
    console.log(`Bookmark removed for file ${fileId}`);
}

// Переключить закладку (установить/удалить)
window.toggleBookmark = function() {
    if (!transcriptViewFileId || currentSegmentIndex < 0) {
        alert('Сначала выберите сегмент транскрипции');
            return;
        }
        
    const currentBookmarkIndex = getBookmarkSegmentIndex(transcriptViewFileId);
    
    if (currentBookmarkIndex === currentSegmentIndex) {
        // Удаляем закладку
        removeBookmark(transcriptViewFileId);
        } else {
        // Устанавливаем закладку
        saveBookmark(transcriptViewFileId, currentSegmentIndex);
    }
    
    // Обновляем отображение
    renderTranscriptSegments();
    updateBookmarkButton();
};

// Перейти к закладке
window.jumpToBookmark = function() {
    if (!transcriptViewFileId) return;
    
    const bookmarkIndex = getBookmarkSegmentIndex(transcriptViewFileId);
    
    if (bookmarkIndex < 0 || bookmarkIndex >= transcriptSegments.length) {
        alert('Закладка не найдена или недействительна');
        return;
    }
    
    // Переходим к сегменту с закладкой
    seekToSegment(bookmarkIndex);
    
    // Прокручиваем к закладке
    scrollToSegment(bookmarkIndex);
};

// Обновить состояние кнопки закладки
function updateBookmarkButton() {
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    const bookmarkIcon = document.getElementById('bookmarkIcon');
    const bookmarkText = document.getElementById('bookmarkText');
    const jumpBtn = document.getElementById('jumpToBookmarkBtn');
    
    if (!bookmarkBtn || !transcriptViewFileId) return;
    
    const bookmarkIndex = getBookmarkSegmentIndex(transcriptViewFileId);
    const hasBookmark = bookmarkIndex >= 0;
    const isCurrentBookmarked = bookmarkIndex === currentSegmentIndex;
    
    // Обновляем кнопку закладки
    if (isCurrentBookmarked) {
        bookmarkBtn.classList.add('active');
        if (bookmarkIcon) bookmarkIcon.textContent = '🔖';
        if (bookmarkText) bookmarkText.textContent = 'Убрать закладку';
        bookmarkBtn.title = 'Удалить закладку с текущего сегмента';
    } else {
        bookmarkBtn.classList.remove('active');
        if (bookmarkIcon) bookmarkIcon.textContent = '🔖';
        if (bookmarkText) bookmarkText.textContent = 'Закладка';
        bookmarkBtn.title = 'Установить закладку на текущий сегмент';
    }
    
    // Показываем/скрываем кнопку перехода к закладке
    if (jumpBtn) {
        if (hasBookmark && !isCurrentBookmarked) {
            jumpBtn.style.display = 'inline-flex';
            } else {
            jumpBtn.style.display = 'none';
        }
    }
}

// Загрузить и применить закладку при открытии модального окна
function loadAndApplyBookmark(fileId) {
    if (!fileId) return;
    
    const bookmarkIndex = getBookmarkSegmentIndex(fileId);
    
    if (bookmarkIndex >= 0 && bookmarkIndex < transcriptSegments.length) {
        // Используем setTimeout, чтобы дать время на рендеринг
        setTimeout(() => {
            scrollToSegment(bookmarkIndex);
            
            // Устанавливаем время аудио на начало закладки
            const segment = transcriptSegments[bookmarkIndex];
            if (segment && segment.startSeconds !== null && audioPlayer) {
                audioPlayer.currentTime = segment.startSeconds;
            }
        }, 300);
    }
}

// Прокрутить к сегменту
function scrollToSegment(segmentIndex) {
    if (segmentIndex < 0 || segmentIndex >= transcriptSegments.length) return;
    
    const segment = transcriptSegments[segmentIndex];
    if (!segment || !segment.element) return;
    
    const container = document.getElementById('transcriptTextContainer');
    if (!container) return;
    
    // Прокручиваем к элементу с небольшим отступом сверху
    const elementTop = segment.element.offsetTop;
    const containerTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const elementHeight = segment.element.offsetHeight;
    
    // Центрируем элемент в контейнере
    const scrollTo = elementTop - (containerHeight / 2) + (elementHeight / 2);
    
    container.scrollTo({
        top: Math.max(0, scrollTo),
        behavior: 'smooth'
    });
}

// ===== ФУНКЦИИ ДЛЯ РЕДАКТИРОВАНИЯ СЕГМЕНТОВ =====

// Сохраняем оригинальный текст для отмены
let segmentOriginalTexts = {};

// Редактировать сегмент
window.editSegment = function(index, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const segment = transcriptSegments[index];
    if (!segment || !segment.element) return;
    
    const textElement = segment.element.querySelector('.segment-original');
    const editBtn = segment.element.querySelector('.segment-edit-btn');
    const saveBtn = segment.element.querySelector('.segment-save-btn');
    const cancelBtn = segment.element.querySelector('.segment-cancel-btn');
    
    if (!textElement || !editBtn || !saveBtn || !cancelBtn) return;
    
    // Сохраняем оригинальный текст
    segmentOriginalTexts[index] = textElement.textContent;
    
    // Делаем элемент редактируемым
    textElement.contentEditable = 'true';
    textElement.focus();
    
    // Показываем/скрываем кнопки
    editBtn.style.display = 'none';
    saveBtn.style.display = 'inline-block';
    cancelBtn.style.display = 'inline-block';
    
    // Выделяем весь текст
    const range = document.createRange();
    range.selectNodeContents(textElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
};

// Сохранить отредактированный сегмент
window.saveSegment = async function(index, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const segment = transcriptSegments[index];
    if (!segment || !segment.element) return;
    
    const textElement = segment.element.querySelector('.segment-original');
    const editBtn = segment.element.querySelector('.segment-edit-btn');
    const saveBtn = segment.element.querySelector('.segment-save-btn');
    const cancelBtn = segment.element.querySelector('.segment-cancel-btn');
    
    if (!textElement || !editBtn || !saveBtn || !cancelBtn) return;
    
    // Cancel auto-save since we're saving manually
    if (typeof cancelAutoSave === 'function') {
        cancelAutoSave();
    }
    
    const newText = textElement.textContent.trim();
    
    if (!newText) {
        alert('Текст не может быть пустым');
        return;
    }
    
    if (!transcriptViewFileId) {
        alert('Ошибка: файл не загружен');
        return;
    }
    
    // Показываем индикатор сохранения
    saveBtn.disabled = true;
    saveBtn.textContent = '💾 Сохранение...';
    
    try {
        // Обновляем текст в сегменте
        segment.text = newText;
        
        // Save to history for undo/redo
        if (typeof saveToHistory === 'function') {
            saveToHistory();
        }
        
        // Собираем полный текст транскрипции
        const fullTranscript = transcriptSegments.map(seg => {
            if (seg.start && seg.end) {
                return `[${seg.start} --> ${seg.end}]  ${seg.text}`;
            }
            return seg.text;
        }).join('\n');
        
        // Отправляем на сервер
        await apiUpdateTranscript(transcriptViewFileId, fullTranscript);
        
        // Успешно сохранено
        textElement.contentEditable = 'false';
        editBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        saveBtn.disabled = false;
        saveBtn.textContent = '💾';
        
        // Удаляем из сохраненных оригиналов
        delete segmentOriginalTexts[index];
        
        showMessage('Сегмент успешно сохранён', 'success');
        
    } catch (error) {
        console.error('Error saving segment:', error);
        alert('Ошибка сохранения: ' + error.message);
        saveBtn.disabled = false;
        saveBtn.textContent = '💾';
    }
};

// Отменить редактирование сегмента
window.cancelEditSegment = function(index, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const segment = transcriptSegments[index];
    if (!segment || !segment.element) return;
    
    const textElement = segment.element.querySelector('.segment-original');
    const editBtn = segment.element.querySelector('.segment-edit-btn');
    const saveBtn = segment.element.querySelector('.segment-save-btn');
    const cancelBtn = segment.element.querySelector('.segment-cancel-btn');
    
    if (!textElement || !editBtn || !saveBtn || !cancelBtn) return;
    
    // Восстанавливаем оригинальный текст
    if (segmentOriginalTexts[index] !== undefined) {
        textElement.textContent = segmentOriginalTexts[index];
        delete segmentOriginalTexts[index];
    }
    
    // Отключаем редактирование
    textElement.contentEditable = 'false';
    
    // Remove input listener
    if (textElement._autoSaveHandler) {
        textElement.removeEventListener('input', textElement._autoSaveHandler);
        delete textElement._autoSaveHandler;
    }
    
    // Показываем/скрываем кнопки
    editBtn.style.display = 'inline-block';
    saveBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
};
