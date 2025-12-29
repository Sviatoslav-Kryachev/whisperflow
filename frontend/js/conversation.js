/**
 * Conversation Module - Основная логика языкового тренажёра
 */

// Глобальные переменные
let currentConversationId = null;
let currentLanguage = 'de';
let currentLevel = 'B1';
let currentTopic = null;
let isRecording = false;
let conversationStartTime = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded - initializing conversation');
    
    // Ждём немного, чтобы убедиться, что speech-recognition.js загружен
    setTimeout(() => {
        initConversation();
        loadTopics();
    }, 100);
});

function initConversation() {
    console.log('Initializing conversation...');
    console.log('speechRecognitionManager:', window.speechRecognitionManager);
    
    // Проверяем поддержку Web Speech API
    if (!window.speechRecognitionManager) {
        console.error('speechRecognitionManager не загружен! Проверьте порядок загрузки скриптов.');
        const recordBtn = document.getElementById('recordBtn');
        if (recordBtn) {
            recordBtn.disabled = true;
            recordBtn.title = 'Голосовой ввод не поддерживается в этом браузере';
        }
        showMessage('Голосовой ввод не поддерживается. Используйте текстовый ввод.', 'warning');
        return;
    }
    
    if (!window.speechRecognitionManager.isSupported()) {
        console.warn('Web Speech API не поддерживается');
        const recordBtn = document.getElementById('recordBtn');
        if (recordBtn) {
            recordBtn.disabled = true;
            recordBtn.title = 'Голосовой ввод не поддерживается в этом браузере';
        }
        showMessage('Голосовой ввод не поддерживается. Используйте текстовый ввод.', 'warning');
        return;
    }
    
    console.log('Web Speech API поддерживается, настраиваем обработчики...');
    
    // Настраиваем обработчики для speech recognition
    window.speechRecognitionManager.onResult((result) => {
        console.log('Speech result:', result);
        handleSpeechResult(result);
    });
    
    window.speechRecognitionManager.onError((error) => {
        console.error('Speech error:', error);
        handleSpeechError(error);
    });
    
    window.speechRecognitionManager.onStart(() => {
        console.log('Recording started');
        onRecordingStart();
    });
    
    window.speechRecognitionManager.onEnd(() => {
        console.log('Recording ended');
        onRecordingEnd();
    });
    
    console.log('Conversation initialized successfully');
}

async function loadTopics() {
    try {
        const data = await apiGetConversationTopics(currentLanguage);
        const topicSelect = document.getElementById('topicSelect');
        
        if (topicSelect && data.topics) {
            // Очищаем опции (кроме "Без темы")
            topicSelect.innerHTML = '<option value="">Без темы</option>';
            
            data.topics.forEach(topic => {
                const option = document.createElement('option');
                option.value = topic.id;
                option.textContent = `${topic.name} - ${topic.description}`;
                topicSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading topics:', error);
    }
}

function updateLanguage() {
    const select = document.getElementById('languageSelect');
    if (select) {
        currentLanguage = select.value;
        if (window.speechRecognitionManager) {
            window.speechRecognitionManager.setLanguage(currentLanguage);
        }
        loadTopics();
        updateChatSubtitle();
    }
}

function updateLevel() {
    const select = document.getElementById('levelSelect');
    if (select) {
        currentLevel = select.value;
        updateChatSubtitle();
    }
}

function updateTopic() {
    const select = document.getElementById('topicSelect');
    if (select) {
        currentTopic = select.value || null;
    }
}

function updateChatSubtitle() {
    const subtitle = document.getElementById('chatSubtitle');
    if (subtitle) {
        const langNames = { 'de': 'Немецкий', 'en': 'Английский' };
        subtitle.textContent = `${langNames[currentLanguage] || currentLanguage} • ${currentLevel}`;
    }
}

async function startNewConversation() {
    try {
        const data = await apiStartConversation(currentLanguage, currentLevel, currentTopic);
        
        currentConversationId = data.conversation_id;
        conversationStartTime = new Date();
        
        // Скрываем welcome message
        const welcomeMessage = document.getElementById('welcomeMessage');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
        
        // Очищаем сообщения
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        
        // Добавляем приветствие бота
        addBotMessage(data.greeting);
        
        // Обновляем заголовок
        const chatTitle = document.getElementById('chatTitle');
        if (chatTitle) {
            const langNames = { 'de': 'Немецкий', 'en': 'Английский' };
            chatTitle.textContent = `Диалог • ${langNames[currentLanguage] || currentLanguage} ${currentLevel}`;
        }
        
        updateChatSubtitle();
        
        showMessage('Диалог начат! Начните говорить или введите сообщение.', 'success');
    } catch (error) {
        console.error('Error starting conversation:', error);
        showMessage('Ошибка начала диалога: ' + error.message, 'error');
    }
}

function toggleRecording() {
    console.log('toggleRecording called, isRecording:', isRecording);
    console.log('speechRecognitionManager:', window.speechRecognitionManager);
    
    if (!window.speechRecognitionManager) {
        console.error('speechRecognitionManager не загружен!');
        alert('Голосовой ввод не поддерживается в этом браузере. Убедитесь, что вы используете Chrome, Edge или другой браузер с поддержкой Web Speech API.');
        return;
    }
    
    if (!window.speechRecognitionManager.isSupported()) {
        console.warn('Web Speech API не поддерживается');
        alert('Голосовой ввод не поддерживается в этом браузере');
        return;
    }
    
    if (isRecording) {
        console.log('Stopping recording...');
        stopRecording();
    } else {
        console.log('Starting recording...');
        // startRecording теперь async, но мы не ждём её завершения здесь
        startRecording().catch(error => {
            console.error('Error in startRecording:', error);
            alert('Ошибка при запуске записи: ' + error.message);
        });
    }
}

// Экспортируем toggleRecording в window сразу после определения
window.toggleRecording = toggleRecording;

async function startRecording() {
    console.log('startRecording called');
    
    // Если диалог не начат, начинаем его автоматически
    if (!currentConversationId) {
        console.log('No conversation started, starting new conversation...');
        try {
            await startNewConversation();
            // После начала диалога продолжаем запуск записи
            // Небольшая задержка, чтобы убедиться, что диалог начат
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error('Error starting conversation:', error);
            alert('Не удалось начать диалог. Попробуйте ещё раз.');
            return;
        }
    }
    
    if (!window.speechRecognitionManager) {
        console.error('speechRecognitionManager не загружен!');
        alert('Ошибка: модуль распознавания речи не загружен');
        return;
    }
    
    try {
        window.speechRecognitionManager.setLanguage(currentLanguage);
        console.log('Language set to:', currentLanguage);
        
        const started = window.speechRecognitionManager.start();
        console.log('Start result:', started);
        
        if (!started) {
            alert('Не удалось начать запись. Проверьте разрешения микрофона.');
        }
    } catch (error) {
        console.error('Error starting recording:', error);
        alert('Ошибка при запуске записи: ' + error.message);
    }
}

function stopRecording() {
    if (window.speechRecognitionManager) {
        window.speechRecognitionManager.stop();
    }
}

function onRecordingStart() {
    isRecording = true;
    const recordBtn = document.getElementById('recordBtn');
    const recordText = document.getElementById('recordText');
    const recordingIndicator = document.getElementById('recordingIndicator');
    
    if (recordBtn) {
        recordBtn.classList.add('recording');
    }
    if (recordingIndicator) {
        recordingIndicator.style.display = 'flex';
    }
    if (recordText) {
        recordText.textContent = 'Остановить';
    }
}

function onRecordingEnd() {
    isRecording = false;
    const recordBtn = document.getElementById('recordBtn');
    const recordText = document.getElementById('recordText');
    const recordingIndicator = document.getElementById('recordingIndicator');
    
    if (recordBtn) {
        recordBtn.classList.remove('recording');
    }
    if (recordingIndicator) {
        recordingIndicator.style.display = 'none';
    }
    if (recordText) {
        recordText.textContent = 'Говорить';
    }
}

function handleSpeechResult(result) {
    const messageInput = document.getElementById('messageInput');
    
    if (messageInput) {
        // Показываем промежуточный результат
        if (result.interim) {
            messageInput.value = result.interim;
        }
        
        // Если это финальный результат, устанавливаем текст и отправляем
        if (result.isFinal && result.final && result.final.trim()) {
            messageInput.value = result.final.trim();
            
            // Автоматически отправляем сообщение
            setTimeout(() => {
                sendMessage();
            }, 300);
        }
    }
}

function handleSpeechError(error) {
    let errorMessage = 'Ошибка распознавания речи';
    
    switch (error) {
        case 'no-speech':
            errorMessage = 'Речь не обнаружена. Попробуйте ещё раз.';
            break;
        case 'audio-capture':
            errorMessage = 'Микрофон не найден. Проверьте подключение.';
            break;
        case 'not-allowed':
            errorMessage = 'Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.';
            break;
        case 'network':
            errorMessage = 'Ошибка сети. Проверьте подключение.';
            break;
    }
    
    showMessage(errorMessage, 'error');
    stopRecording();
}

function handleInputKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    
    if (!messageInput || !messageInput.value.trim()) {
        return;
    }
    
    // Если диалог не начат, начинаем его автоматически
    if (!currentConversationId) {
        console.log('sendMessage: no conversation, starting new one...');
        try {
            await startNewConversation();
            // Небольшая задержка, чтобы убедиться, что диалог начат
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error('Error starting conversation:', error);
            showMessage('Не удалось начать диалог. Попробуйте ещё раз.', 'error');
            return;
        }
    }
    
    const text = messageInput.value.trim();
    console.log('sendMessage: sending text:', text);
    messageInput.value = '';
    
    // Добавляем сообщение пользователя в чат
    addUserMessage(text);
    
    // Показываем индикатор загрузки
    addLoadingMessage();
    
    try {
        console.log('sendMessage: calling apiSendMessage with conversationId:', currentConversationId);
        const response = await apiSendMessage(currentConversationId, text);
        console.log('sendMessage: received response:', response);
        
        // Убираем индикатор загрузки
        removeLoadingMessage();
        
        // Добавляем ответ бота
        addBotMessage(response.bot_message.text, response.correction);
        
        // Обновляем статистику
        updateStats();
        
    } catch (error) {
        console.error('Error sending message:', error);
        removeLoadingMessage();
        showMessage('Ошибка отправки сообщения: ' + error.message, 'error');
    }
}

function addUserMessage(text, isCorrected = false, correctedText = null) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message message-user';
    
    let content = `<div class="message-content">${escapeHtml(text)}</div>`;
    
    if (isCorrected && correctedText) {
        content += `<div class="message-correction">
            <span class="correction-icon">✏️</span>
            <span class="correction-text">Правильно: ${escapeHtml(correctedText)}</span>
        </div>`;
    }
    
    messageDiv.innerHTML = content;
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

function addBotMessage(text, correction = null) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message message-bot';
    
    let content = `<div class="message-content-wrapper">`;
    
    // Статус проверки (согласно ТЗ)
    if (correction) {
        const isCorrect = correction.is_correct !== undefined ? correction.is_correct : !correction.has_errors;
        if (isCorrect) {
            content += `<div class="correction-status correct">✅ Correct!</div>`;
        } else {
            content += `<div class="correction-status incorrect">❌ Needs correction</div>`;
        }
    }
    
    // Основное сообщение бота
    content += `<div class="message-content">${escapeHtml(text)}</div>`;
    
    // Информация об исправлении (если есть ошибки)
    const hasErrors = correction && (correction.has_errors || (correction.is_correct !== undefined && !correction.is_correct));
    if (hasErrors && correction.corrected_text) {
        const correctedText = correction.corrected_text || '';
        const originalText = correction.original_text || '';
        
        // Показываем исправленный вариант, если он отличается от оригинального
        if (correctedText && correctedText.trim() !== originalText.trim()) {
            // Экранируем текст для использования в onclick (убираем переносы строк и экранируем кавычки)
            const escapedCorrectedText = correctedText.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ').replace(/\r/g, '');
            content += `<div class="message-correction-info">
                <div class="correction-label">Правильно:</div>
                <div class="correction-text">${escapeHtml(correctedText)}</div>
                <button class="btn-play-voice" onclick="playTextToSpeech('${escapedCorrectedText}', '${currentLanguage}')" title="Прослушать голосом">
                    🔊 Прослушать правильный вариант
                </button>
            </div>`;
        }
        
        // Краткое объяснение
        if (correction.explanation && correction.explanation.trim()) {
            content += `<div class="correction-explanation">
                <span class="explanation-icon">💡</span>
                <span class="explanation-text">${escapeHtml(correction.explanation)}</span>
            </div>`;
        }
    }
    
    // Кнопка для прослушивания ответа бота голосом
    const escapedText = text.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ');
    content += `<div class="message-actions">
        <button class="btn-play-voice" onclick="playTextToSpeech('${escapedText}', '${currentLanguage}')" title="Прослушать голосом">
            🔊 Прослушать ответ
        </button>
    </div>`;
    
    content += `</div>`;
    
    messageDiv.innerHTML = content;
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

function addLoadingMessage() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message message-bot loading';
    loadingDiv.id = 'loadingMessage';
    loadingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content-wrapper">
            <div class="message-content">
                <span class="typing-indicator">
                    <span></span><span></span><span></span>
                </span>
            </div>
        </div>
    `;
    messagesContainer.appendChild(loadingDiv);
    scrollToBottom();
}

function removeLoadingMessage() {
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) {
        loadingMessage.remove();
    }
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMessage(text, type = 'info') {
    // Простая реализация уведомлений (можно улучшить)
    console.log(`[${type.toUpperCase()}] ${text}`);
    // TODO: Добавить визуальные уведомления
}

async function updateStats() {
    if (!currentConversationId) return;
    
    try {
        const stats = await apiGetConversationStats(currentConversationId);
        
        const statMessages = document.getElementById('statMessages');
        const statCorrections = document.getElementById('statCorrections');
        const statTime = document.getElementById('statTime');
        
        if (statMessages) statMessages.textContent = stats.total_messages || 0;
        if (statCorrections) statCorrections.textContent = stats.total_corrections || 0;
        if (statTime && conversationStartTime) {
            const minutes = Math.floor((new Date() - conversationStartTime) / 60000);
            statTime.textContent = `${minutes} мин`;
        }
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

function toggleSettings() {
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsPanel) {
        settingsPanel.classList.toggle('visible');
    }
}

async function showConversationHistory() {
    const modal = document.getElementById('historyModal');
    const historyList = document.getElementById('historyList');
    
    if (!modal || !historyList) return;
    
    try {
        const data = await apiListConversations(20, 0);
        historyList.innerHTML = '';
        
        if (data.conversations.length === 0) {
            historyList.innerHTML = '<p style="text-align: center; color: #6b7280;">Нет сохранённых диалогов</p>';
        } else {
            data.conversations.forEach(conv => {
                const item = document.createElement('div');
                item.className = 'history-item';
                item.innerHTML = `
                    <div class="history-item-header">
                        <span class="history-item-lang">${conv.language.toUpperCase()}</span>
                        <span class="history-item-level">${conv.level}</span>
                        <span class="history-item-date">${new Date(conv.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="history-item-info">
                        <span>${conv.total_messages} сообщений</span>
                        <span>${conv.total_corrections} исправлений</span>
                    </div>
                `;
                item.onclick = () => loadConversation(conv.id);
                historyList.appendChild(item);
            });
        }
        
        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error loading history:', error);
        showMessage('Ошибка загрузки истории', 'error');
    }
}

function closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function loadConversation(conversationId) {
    try {
        const data = await apiGetConversationHistory(conversationId);
        
        currentConversationId = conversationId;
        
        // Обновляем настройки
        const langSelect = document.getElementById('languageSelect');
        const levelSelect = document.getElementById('levelSelect');
        
        if (langSelect) langSelect.value = data.conversation.language;
        if (levelSelect) levelSelect.value = data.conversation.level;
        
        currentLanguage = data.conversation.language;
        currentLevel = data.conversation.level;
        
        // Очищаем и загружаем сообщения
        const messagesContainer = document.getElementById('messagesContainer');
        const welcomeMessage = document.getElementById('welcomeMessage');
        
        if (welcomeMessage) welcomeMessage.style.display = 'none';
        if (messagesContainer) messagesContainer.innerHTML = '';
        
        data.messages.forEach(msg => {
            if (msg.role === 'user') {
                const correctionData = msg.correction_data ? JSON.parse(msg.correction_data) : null;
                addUserMessage(
                    msg.content,
                    msg.is_corrected,
                    correctionData?.corrected_text
                );
            } else {
                const correctionData = msg.correction_data ? JSON.parse(msg.correction_data) : null;
                addBotMessage(msg.content, correctionData);
            }
        });
        
        updateStats();
        closeHistoryModal();
        showMessage('Диалог загружен', 'success');
    } catch (error) {
        console.error('Error loading conversation:', error);
        showMessage('Ошибка загрузки диалога', 'error');
    }
}

// Text-to-Speech для голосовых ответов
window.playTextToSpeech = function(text, language = 'de') {
    if (!('speechSynthesis' in window)) {
        console.warn('Text-to-Speech не поддерживается в этом браузере');
        alert('Голосовое воспроизведение не поддерживается в этом браузере');
        return;
    }
    
    // Останавливаем текущее воспроизведение
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Устанавливаем язык
    const langMap = {
        'de': 'de-DE',
        'en': 'en-US',
        'fr': 'fr-FR',
        'es': 'es-ES'
    };
    utterance.lang = langMap[language] || language || 'de-DE';
    
    // Настройки голоса
    utterance.rate = 0.9; // Скорость речи (чуть медленнее для лучшего понимания)
    utterance.pitch = 1; // Высота голоса
    utterance.volume = 1; // Громкость
    
    // Пытаемся выбрать подходящий голос
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
        voice.lang.startsWith(langMap[language] || language || 'de') && voice.localService
    );
    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }
    
    utterance.onerror = (event) => {
        console.error('SpeechSynthesis error:', event);
        alert('Ошибка воспроизведения голоса');
    };
    
    window.speechSynthesis.speak(utterance);
};

// Загружаем голоса при загрузке страницы
if ('speechSynthesis' in window) {
    // Некоторые браузеры загружают голоса асинхронно
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => {
            console.log('Voices loaded:', speechSynthesis.getVoices().length);
        };
    }
}

// Экспортируем функции для использования в HTML
// (toggleRecording уже экспортирована сразу после определения)
window.startNewConversation = startNewConversation;
window.sendMessage = sendMessage;
window.handleInputKeyPress = handleInputKeyPress;
window.updateLanguage = updateLanguage;
window.updateLevel = updateLevel;
window.updateTopic = updateTopic;
window.toggleSettings = toggleSettings;
window.showConversationHistory = showConversationHistory;
window.closeHistoryModal = closeHistoryModal;
