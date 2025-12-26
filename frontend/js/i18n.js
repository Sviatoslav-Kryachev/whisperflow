// Internationalization (i18n) module

const LANGUAGES = {
    ru: { flag: '🇷🇺', name: 'Русский', nativeName: 'Русский' },
    en: { flag: '🇬🇧', name: 'English', nativeName: 'English' },
    de: { flag: '🇩🇪', name: 'Deutsch', nativeName: 'Немецкий' },
    fr: { flag: '🇫🇷', name: 'Français', nativeName: 'Французский' },
    es: { flag: '🇪🇸', name: 'Español', nativeName: 'Испанский' },
    it: { flag: '🇮🇹', name: 'Italiano', nativeName: 'Итальянский' },
    pt: { flag: '🇵🇹', name: 'Português', nativeName: 'Португальский' },
    pl: { flag: '🇵🇱', name: 'Polski', nativeName: 'Польский' },
    uk: { flag: '🇺🇦', name: 'Українська', nativeName: 'Украинский' },
    tr: { flag: '🇹🇷', name: 'Türkçe', nativeName: 'Турецкий' },
    zh: { flag: '🇨🇳', name: '简体中文', nativeName: 'Китайский' },
    ja: { flag: '🇯🇵', name: '日本語', nativeName: 'Японский' },
    ko: { flag: '🇰🇷', name: '한국어', nativeName: 'Корейский' },
    ar: { flag: '🇸🇦', name: 'العربية', nativeName: 'Арабский' }
};

const TRANSLATIONS = {
    ru: {
        // Header
        'nav.dashboard': 'Dashboard',
        'nav.logout': 'Выйти',
        
        // Dashboard
        'dashboard.title': 'WhisperFlow Dashboard',
        'dashboard.subtitle': 'Загрузите аудиофайл для транскрипции',
        'upload.title': 'Загрузка аудио',
        'upload.dropzone': 'Нажмите или перетащите файл сюда',
        'upload.selectFile': 'Выберите аудиофайл',
        'upload.model': 'Модель Whisper:',
        'upload.button': 'Загрузить и транскрибировать',
        'upload.processing': 'Обработка...',
        
        // Models
        'model.tiny': 'Tiny (быстрая, менее точная)',
        'model.base': 'Base (рекомендуется)',
        'model.small': 'Small (более точная)',
        'model.medium': 'Medium (очень точная)',
        'model.large': 'Large (максимальная точность)',
        
        // Transcripts
        'transcripts.title': 'Мои транскрипции',
        'transcripts.empty': 'Пока нет транскрипций',
        'transcripts.emptyHint': 'Загрузите первый аудиофайл для начала',
        'transcripts.view': 'Просмотр',
        'transcripts.download': 'Скачать',
        'transcripts.retry': 'Повторить',
        'transcripts.model': 'Модель',
        'transcripts.size': 'Размер',
        'transcripts.created': 'Создано',
        
        // Statuses
        'status.pending': 'Ожидание',
        'status.processing': 'Обработка',
        'status.completed': 'Готово',
        'status.failed': 'Ошибка',
        
        // Sidebar
        'sidebar.labels': 'Ярлыки',
        'sidebar.recentFiles': 'Последние файлы',
        'sidebar.allFiles': 'Все файлы',
        'sidebar.folders': 'Папки',
        'sidebar.newFolder': 'Новая папка',
        'sidebar.noFolders': 'Нет папок',
        
        // Modals
        'modal.newFolder': 'Новая папка',
        'modal.newFolderDesc': 'Папки группируют связанные файлы вместе.',
        'modal.folderName': 'Название папки',
        'modal.createFolder': 'СОЗДАТЬ ПАПКУ',
        'modal.moveToFolder': 'Переместить в папку',
        'modal.noFolder': 'Без папки',
        'modal.createFolderBtn': 'Создать папку',
        
        // Actions
        'action.rename': 'Переименовать',
        'action.delete': 'Удалить',
        'action.move': 'Переместить в папку',
        
        // Messages
        'msg.fileRenamed': 'Файл переименован',
        'msg.fileDeleted': 'Запись удалена',
        'msg.fileMoved': 'Файл перемещён в',
        'msg.folderCreated': 'Папка создана',
        'msg.folderRenamed': 'Папка переименована',
        'msg.folderDeleted': 'Папка удалена',
        'msg.processingRestarted': 'Обработка перезапущена',
        
        // Confirmations
        'confirm.deleteFile': 'Удалить "{filename}"?\n\nЭто действие нельзя отменить. Будут удалены аудиофайл и транскрипция.',
        'confirm.deleteFolder': 'Удалить папку "{name}"?\n\nФайлы внутри папки не будут удалены.',
        'confirm.retry': 'Повторить обработку этого файла?',
        'confirm.enterNewName': 'Введите новое имя файла:',
        'confirm.enterFolderName': 'Введите новое название папки:',
        
        // Language
        'language': 'Язык',
        
        // Footer
        'footer.copyright': '© 2025 WhisperFlow. Транскрипция аудио с помощью AI'
    },
    
    en: {
        // Header
        'nav.dashboard': 'Dashboard',
        'nav.logout': 'Logout',
        
        // Dashboard
        'dashboard.title': 'WhisperFlow Dashboard',
        'dashboard.subtitle': 'Upload an audio file for transcription',
        'upload.title': 'Upload Audio',
        'upload.dropzone': 'Click or drag file here',
        'upload.selectFile': 'Select audio file',
        'upload.model': 'Whisper Model:',
        'upload.button': 'Upload and Transcribe',
        'upload.processing': 'Processing...',
        
        // Models
        'model.tiny': 'Tiny (fast, less accurate)',
        'model.base': 'Base (recommended)',
        'model.small': 'Small (more accurate)',
        'model.medium': 'Medium (very accurate)',
        'model.large': 'Large (maximum accuracy)',
        
        // Transcripts
        'transcripts.title': 'My Transcriptions',
        'transcripts.empty': 'No transcriptions yet',
        'transcripts.emptyHint': 'Upload your first audio file to get started',
        'transcripts.view': 'View',
        'transcripts.download': 'Download',
        'transcripts.retry': 'Retry',
        'transcripts.model': 'Model',
        'transcripts.size': 'Size',
        'transcripts.created': 'Created',
        
        // Statuses
        'status.pending': 'Pending',
        'status.processing': 'Processing',
        'status.completed': 'Completed',
        'status.failed': 'Failed',
        
        // Sidebar
        'sidebar.labels': 'Labels',
        'sidebar.recentFiles': 'Recent Files',
        'sidebar.allFiles': 'All Files',
        'sidebar.folders': 'Folders',
        'sidebar.newFolder': 'New Folder',
        'sidebar.noFolders': 'No folders',
        
        // Modals
        'modal.newFolder': 'New Folder',
        'modal.newFolderDesc': 'Folders group related files together.',
        'modal.folderName': 'Folder name',
        'modal.createFolder': 'CREATE FOLDER',
        'modal.moveToFolder': 'Move to Folder',
        'modal.noFolder': 'No folder',
        'modal.createFolderBtn': 'Create folder',
        
        // Actions
        'action.rename': 'Rename',
        'action.delete': 'Delete',
        'action.move': 'Move to folder',
        
        // Messages
        'msg.fileRenamed': 'File renamed',
        'msg.fileDeleted': 'File deleted',
        'msg.fileMoved': 'File moved to',
        'msg.folderCreated': 'Folder created',
        'msg.folderRenamed': 'Folder renamed',
        'msg.folderDeleted': 'Folder deleted',
        'msg.processingRestarted': 'Processing restarted',
        
        // Confirmations
        'confirm.deleteFile': 'Delete "{filename}"?\n\nThis action cannot be undone. Audio file and transcription will be deleted.',
        'confirm.deleteFolder': 'Delete folder "{name}"?\n\nFiles inside the folder will not be deleted.',
        'confirm.retry': 'Retry processing this file?',
        'confirm.enterNewName': 'Enter new file name:',
        'confirm.enterFolderName': 'Enter new folder name:',
        
        // Language
        'language': 'Language',
        
        // Footer
        'footer.copyright': '© 2025 WhisperFlow. AI-powered audio transcription'
    },
    
    de: {
        // Header
        'nav.dashboard': 'Dashboard',
        'nav.logout': 'Abmelden',
        
        // Dashboard
        'dashboard.title': 'WhisperFlow Dashboard',
        'dashboard.subtitle': 'Laden Sie eine Audiodatei zur Transkription hoch',
        'upload.title': 'Audio hochladen',
        'upload.dropzone': 'Klicken oder Datei hierher ziehen',
        'upload.selectFile': 'Audiodatei auswählen',
        'upload.model': 'Whisper Modell:',
        'upload.button': 'Hochladen und Transkribieren',
        'upload.processing': 'Verarbeitung...',
        
        // Models
        'model.tiny': 'Tiny (schnell, weniger genau)',
        'model.base': 'Base (empfohlen)',
        'model.small': 'Small (genauer)',
        'model.medium': 'Medium (sehr genau)',
        'model.large': 'Large (maximale Genauigkeit)',
        
        // Transcripts
        'transcripts.title': 'Meine Transkriptionen',
        'transcripts.empty': 'Noch keine Transkriptionen',
        'transcripts.emptyHint': 'Laden Sie Ihre erste Audiodatei hoch',
        'transcripts.view': 'Ansehen',
        'transcripts.download': 'Herunterladen',
        'transcripts.retry': 'Wiederholen',
        'transcripts.model': 'Modell',
        'transcripts.size': 'Größe',
        'transcripts.created': 'Erstellt',
        
        // Statuses
        'status.pending': 'Wartend',
        'status.processing': 'Verarbeitung',
        'status.completed': 'Fertig',
        'status.failed': 'Fehler',
        
        // Sidebar
        'sidebar.labels': 'Labels',
        'sidebar.recentFiles': 'Letzte Dateien',
        'sidebar.allFiles': 'Alle Dateien',
        'sidebar.folders': 'Ordner',
        'sidebar.newFolder': 'Neuer Ordner',
        'sidebar.noFolders': 'Keine Ordner',
        
        // Modals
        'modal.newFolder': 'Neuer Ordner',
        'modal.newFolderDesc': 'Ordner gruppieren zusammengehörige Dateien.',
        'modal.folderName': 'Ordnername',
        'modal.createFolder': 'ORDNER ERSTELLEN',
        'modal.moveToFolder': 'In Ordner verschieben',
        'modal.noFolder': 'Kein Ordner',
        'modal.createFolderBtn': 'Ordner erstellen',
        
        // Actions
        'action.rename': 'Umbenennen',
        'action.delete': 'Löschen',
        'action.move': 'In Ordner verschieben',
        
        // Messages
        'msg.fileRenamed': 'Datei umbenannt',
        'msg.fileDeleted': 'Datei gelöscht',
        'msg.fileMoved': 'Datei verschoben nach',
        'msg.folderCreated': 'Ordner erstellt',
        'msg.folderRenamed': 'Ordner umbenannt',
        'msg.folderDeleted': 'Ordner gelöscht',
        'msg.processingRestarted': 'Verarbeitung neu gestartet',
        
        // Confirmations
        'confirm.deleteFile': '"{filename}" löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.',
        'confirm.deleteFolder': 'Ordner "{name}" löschen?\n\nDateien im Ordner werden nicht gelöscht.',
        'confirm.retry': 'Verarbeitung dieser Datei wiederholen?',
        'confirm.enterNewName': 'Neuen Dateinamen eingeben:',
        'confirm.enterFolderName': 'Neuen Ordnernamen eingeben:',
        
        // Language
        'language': 'Sprache',
        
        // Footer
        'footer.copyright': '© 2025 WhisperFlow. KI-gestützte Audio-Transkription'
    }
};

// Current language
let currentLang = localStorage.getItem('whisperflow_lang') || 'ru';

// Get translation
function t(key, params = {}) {
    const lang = TRANSLATIONS[currentLang] || TRANSLATIONS['en'];
    let text = lang[key] || TRANSLATIONS['en'][key] || key;
    
    // Replace parameters like {filename}
    Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
    });
    
    return text;
}

// Set language
function setLanguage(lang) {
    if (LANGUAGES[lang]) {
        currentLang = lang;
        localStorage.setItem('whisperflow_lang', lang);
        updatePageTranslations();
        updateLanguageSelector();
    }
}

// Get current language
function getCurrentLanguage() {
    return currentLang;
}

// Get all languages
function getLanguages() {
    return LANGUAGES;
}

// Update page translations
function updatePageTranslations() {
    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });
    
    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });
    
    // Update titles
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.title = t(key);
    });
    
    // Refresh dynamic content if functions exist
    if (typeof loadTranscripts === 'function') {
        loadTranscripts();
    }
    if (typeof renderFolders === 'function') {
        renderFolders();
    }
}

// Update language selector display
function updateLanguageSelector() {
    const currentFlag = document.getElementById('currentLangFlag');
    const currentName = document.getElementById('currentLangName');
    
    if (currentFlag && currentName && LANGUAGES[currentLang]) {
        currentFlag.textContent = LANGUAGES[currentLang].flag;
        currentName.textContent = LANGUAGES[currentLang].name;
    }
}

// Toggle language dropdown
function toggleLanguageDropdown() {
    const dropdown = document.getElementById('languageDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    const langSelector = document.querySelector('.language-selector');
    const dropdown = document.getElementById('languageDropdown');
    
    if (langSelector && dropdown && !langSelector.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});

// Mobile sidebar toggle
function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('mobile-open');
    }
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', function(e) {
    const sidebar = document.querySelector('.sidebar');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    
    if (sidebar && sidebar.classList.contains('mobile-open')) {
        if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
            sidebar.classList.remove('mobile-open');
        }
    }
});

// Close sidebar when selecting item on mobile
function closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && window.innerWidth <= 768) {
        sidebar.classList.remove('mobile-open');
    }
}

// Initialize language on page load
document.addEventListener('DOMContentLoaded', function() {
    updateLanguageSelector();
});

