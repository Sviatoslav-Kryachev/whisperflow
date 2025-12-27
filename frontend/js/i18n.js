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
        'nav.howto': 'Инструкция',
        'nav.faq': 'FAQ',
        'nav.logout': 'Выйти',
        
        // Dashboard
        'dashboard.title': 'WhisperFlow Dashboard',
        'dashboard.subtitle': 'Загрузите аудиофайл для транскрипции',
        'upload.title': 'Загрузка аудио',
        'upload.dropzone': 'Нажмите или перетащите файл сюда',
        'upload.selectFile': 'Выберите аудиофайл',
        'upload.model': 'Модель Whisper:',
        'upload.language': 'Язык аудио:',
        'lang.auto': '🔍 Автоопределение',
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
        'modal.cancel': 'Отмена',
        'modal.moveToFolder': 'Переместить в папку',
        'modal.noFolder': 'Без папки',
        'modal.createFolderBtn': 'Создать папку',
        
        // Actions
        'action.rename': 'Переименовать',
        'action.delete': 'Удалить',
        'action.move': 'Переместить в папку',
        'action.export': 'Экспорт',
        
        // Export
        'export.title': 'Экспорт',
        'export.docx': 'В формате DOCX',
        'export.docxDesc': 'Microsoft Word и Google Doc',
        'export.xlsx': 'В формате XLSX',
        'export.xlsxDesc': 'Microsoft Excel и Google Sheets',
        'export.srt': 'В формате SRT',
        'export.srtDesc': 'Для субтитров YouTube',
        'export.txt': 'В формате TXT',
        'export.txtDesc': 'Блокнот и Notepad++',
        
        // Reviews
        'reviews.title': 'Отзывы',
        'reviews.addReview': 'Оставить отзыв',
        'reviews.modalTitle': 'Оставить отзыв',
        'reviews.modalDesc': 'Поделитесь своим опытом использования WhisperFlow',
        'reviews.yourName': 'Ваше имя',
        'reviews.yourReview': 'Ваш отзыв',
        'reviews.rating': 'Оценка',
        'reviews.submit': 'Отправить',
        
        // Use Cases
        'usecases.title': 'Идеально для любых задач',
        'usecases.subtitle': 'Узнайте, как WhisperFlow помогает в различных сценариях',
        'usecases.meetings': 'Деловые встречи',
        'usecases.meetingsDesc': 'Конвертируйте записи совещаний и Zoom-звонков в текстовые протоколы',
        'usecases.interviews': 'Интервью и подкасты',
        'usecases.interviewsDesc': 'Превращайте аудиозаписи интервью в готовые статьи и публикации',
        'usecases.education': 'Образование',
        'usecases.educationDesc': 'Транскрибируйте лекции и вебинары для удобного изучения',
        'usecases.medical': 'Медицинские записи',
        'usecases.medicalDesc': 'Переводите голосовые заметки врачей в структурированные документы',
        'usecases.content': 'Контент-мейкеры',
        'usecases.contentDesc': 'Создавайте субтитры для YouTube и текст для блогов из видео',
        'usecases.voice': 'Голосовые заметки',
        'usecases.voiceDesc': 'Конвертируйте сообщения из WhatsApp и Telegram в текст',
        
        // How to Use
        'howto.title': 'Как пользоваться WhisperFlow',
        'howto.subtitle': 'Бесплатно и в 3 шага: из аудио в текст одним кликом',
        'howto.step1title': 'Шаг 1: Загрузите файл',
        'howto.step1desc': 'Выберите MP3, WAV, OGG или другой аудиофайл и перетащите в область загрузки.',
        'howto.step1btn': 'Загрузить аудио',
        'howto.step2title': 'Шаг 2: Запустите распознавание',
        'howto.step2desc': 'Нажмите кнопку и Whisper AI мгновенно преобразует речь в текст с таймкодами.',
        'howto.step2btn': 'Транскрибировать',
        'howto.step3title': 'Шаг 3: Скачайте результат',
        'howto.step3desc': 'Экспортируйте транскрипцию в Word, Excel, субтитры SRT или простой текст.',
        
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
        'footer.desc': 'Бесплатная транскрипция аудио в текст с использованием технологии OpenAI Whisper. Работает локально — ваши данные остаются приватными.',
        'footer.navigation': 'Навигация',
        'footer.dashboard': 'Dashboard',
        'footer.howto': 'Как пользоваться',
        'footer.faq': 'Вопросы и ответы',
        'footer.features': 'Возможности',
        'footer.feat1': '90+ языков',
        'footer.feat2': 'Экспорт в DOCX/XLSX',
        'footer.feat3': 'Субтитры SRT',
        'footer.feat4': 'Таймкоды',
        'footer.contact': 'Контакты',
        'footer.contactDesc': 'Есть вопросы или предложения?',
        'footer.copyright': '© 2025 WhisperFlow. Транскрипция аудио с помощью AI',
        'footer.made': 'Сделано с ❤️ для работы с аудио'
    },
    
    en: {
        // Header
        'nav.dashboard': 'Dashboard',
        'nav.howto': 'How to use',
        'nav.faq': 'FAQ',
        'nav.logout': 'Logout',
        
        // Dashboard
        'dashboard.title': 'WhisperFlow Dashboard',
        'dashboard.subtitle': 'Upload an audio file for transcription',
        'upload.title': 'Upload Audio',
        'upload.dropzone': 'Click or drag file here',
        'upload.selectFile': 'Select audio file',
        'upload.model': 'Whisper Model:',
        'upload.language': 'Audio Language:',
        'lang.auto': '🔍 Auto-detect',
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
        'modal.cancel': 'Cancel',
        'modal.moveToFolder': 'Move to Folder',
        'modal.noFolder': 'No folder',
        'modal.createFolderBtn': 'Create folder',
        
        // Actions
        'action.rename': 'Rename',
        'action.delete': 'Delete',
        'action.move': 'Move to folder',
        'action.export': 'Export',
        
        // Export
        'export.title': 'Export',
        'export.docx': 'DOCX format',
        'export.docxDesc': 'Microsoft Word & Google Doc',
        'export.xlsx': 'XLSX format',
        'export.xlsxDesc': 'Microsoft Excel & Google Sheets',
        'export.srt': 'SRT format',
        'export.srtDesc': 'For YouTube subtitles',
        'export.txt': 'TXT format',
        'export.txtDesc': 'Notepad & Notepad++',
        
        // Reviews
        'reviews.title': 'Reviews',
        'reviews.addReview': 'Write a review',
        'reviews.modalTitle': 'Write a review',
        'reviews.modalDesc': 'Share your experience with WhisperFlow',
        'reviews.yourName': 'Your name',
        'reviews.yourReview': 'Your review',
        'reviews.rating': 'Rating',
        'reviews.submit': 'Submit',
        
        // Use Cases
        'usecases.title': 'Perfect for any task',
        'usecases.subtitle': 'Discover how WhisperFlow helps in various scenarios',
        'usecases.meetings': 'Business Meetings',
        'usecases.meetingsDesc': 'Convert meeting recordings and Zoom calls into text protocols',
        'usecases.interviews': 'Interviews & Podcasts',
        'usecases.interviewsDesc': 'Transform audio interviews into ready-to-publish articles',
        'usecases.education': 'Education',
        'usecases.educationDesc': 'Transcribe lectures and webinars for convenient studying',
        'usecases.medical': 'Medical Records',
        'usecases.medicalDesc': 'Convert voice notes from doctors into structured documents',
        'usecases.content': 'Content Creators',
        'usecases.contentDesc': 'Create YouTube subtitles and blog text from videos',
        'usecases.voice': 'Voice Messages',
        'usecases.voiceDesc': 'Convert WhatsApp and Telegram messages to text',
        
        // How to Use
        'howto.title': 'How to use WhisperFlow',
        'howto.subtitle': 'Free and in 3 steps: from audio to text in one click',
        'howto.step1title': 'Step 1: Upload file',
        'howto.step1desc': 'Select MP3, WAV, OGG or another audio file and drag it to the upload area.',
        'howto.step1btn': 'Upload audio',
        'howto.step2title': 'Step 2: Start recognition',
        'howto.step2desc': 'Click the button and Whisper AI will instantly convert speech to text with timestamps.',
        'howto.step2btn': 'Transcribe',
        'howto.step3title': 'Step 3: Download result',
        'howto.step3desc': 'Export transcription to Word, Excel, SRT subtitles or plain text.',
        
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
        'footer.desc': 'Free audio to text transcription using OpenAI Whisper technology. Works locally — your data stays private.',
        'footer.navigation': 'Navigation',
        'footer.dashboard': 'Dashboard',
        'footer.howto': 'How to use',
        'footer.faq': 'FAQ',
        'footer.features': 'Features',
        'footer.feat1': '90+ languages',
        'footer.feat2': 'Export to DOCX/XLSX',
        'footer.feat3': 'SRT subtitles',
        'footer.feat4': 'Timestamps',
        'footer.contact': 'Contact',
        'footer.contactDesc': 'Have questions or suggestions?',
        'footer.copyright': '© 2025 WhisperFlow. AI-powered audio transcription',
        'footer.made': 'Made with ❤️ for audio work'
    },
    
    de: {
        // Header
        'nav.dashboard': 'Dashboard',
        'nav.howto': 'Anleitung',
        'nav.faq': 'FAQ',
        'nav.logout': 'Abmelden',
        
        // Dashboard
        'dashboard.title': 'WhisperFlow Dashboard',
        'dashboard.subtitle': 'Laden Sie eine Audiodatei zur Transkription hoch',
        'upload.title': 'Audio hochladen',
        'upload.dropzone': 'Klicken oder Datei hierher ziehen',
        'upload.selectFile': 'Audiodatei auswählen',
        'upload.model': 'Whisper Modell:',
        'upload.language': 'Audio-Sprache:',
        'lang.auto': '🔍 Automatisch erkennen',
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
        'modal.cancel': 'Abbrechen',
        'modal.moveToFolder': 'In Ordner verschieben',
        'modal.noFolder': 'Kein Ordner',
        'modal.createFolderBtn': 'Ordner erstellen',
        
        // Actions
        'action.rename': 'Umbenennen',
        'action.delete': 'Löschen',
        'action.move': 'In Ordner verschieben',
        'action.export': 'Exportieren',
        
        // Export
        'export.title': 'Exportieren',
        'export.docx': 'DOCX Format',
        'export.docxDesc': 'Microsoft Word & Google Doc',
        'export.xlsx': 'XLSX Format',
        'export.xlsxDesc': 'Microsoft Excel & Google Sheets',
        'export.srt': 'SRT Format',
        'export.srtDesc': 'Für YouTube Untertitel',
        'export.txt': 'TXT Format',
        'export.txtDesc': 'Editor & Notepad++',
        
        // Reviews
        'reviews.title': 'Bewertungen',
        'reviews.addReview': 'Bewertung schreiben',
        'reviews.modalTitle': 'Bewertung schreiben',
        'reviews.modalDesc': 'Teilen Sie Ihre Erfahrungen mit WhisperFlow',
        'reviews.yourName': 'Ihr Name',
        'reviews.yourReview': 'Ihre Bewertung',
        'reviews.rating': 'Bewertung',
        'reviews.submit': 'Absenden',
        
        // Use Cases
        'usecases.title': 'Perfekt für jede Aufgabe',
        'usecases.subtitle': 'Entdecken Sie, wie WhisperFlow in verschiedenen Szenarien hilft',
        'usecases.meetings': 'Geschäftsmeetings',
        'usecases.meetingsDesc': 'Wandeln Sie Besprechungsaufnahmen und Zoom-Anrufe in Textprotokolle um',
        'usecases.interviews': 'Interviews & Podcasts',
        'usecases.interviewsDesc': 'Verwandeln Sie Audio-Interviews in veröffentlichungsreife Artikel',
        'usecases.education': 'Bildung',
        'usecases.educationDesc': 'Transkribieren Sie Vorlesungen und Webinare zum bequemen Lernen',
        'usecases.medical': 'Medizinische Aufzeichnungen',
        'usecases.medicalDesc': 'Wandeln Sie Sprachnotizen von Ärzten in strukturierte Dokumente um',
        'usecases.content': 'Content Creator',
        'usecases.contentDesc': 'Erstellen Sie YouTube-Untertitel und Blogtexte aus Videos',
        'usecases.voice': 'Sprachnachrichten',
        'usecases.voiceDesc': 'Konvertieren Sie WhatsApp- und Telegram-Nachrichten in Text',
        
        // How to Use
        'howto.title': 'So verwenden Sie WhisperFlow',
        'howto.subtitle': 'Kostenlos und in 3 Schritten: von Audio zu Text mit einem Klick',
        'howto.step1title': 'Schritt 1: Datei hochladen',
        'howto.step1desc': 'Wählen Sie MP3, WAV, OGG oder eine andere Audiodatei und ziehen Sie sie in den Upload-Bereich.',
        'howto.step1btn': 'Audio hochladen',
        'howto.step2title': 'Schritt 2: Erkennung starten',
        'howto.step2desc': 'Klicken Sie auf die Schaltfläche und Whisper AI wandelt Sprache sofort in Text mit Zeitstempeln um.',
        'howto.step2btn': 'Transkribieren',
        'howto.step3title': 'Schritt 3: Ergebnis herunterladen',
        'howto.step3desc': 'Exportieren Sie die Transkription nach Word, Excel, SRT-Untertitel oder Klartext.',
        
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
        'footer.desc': 'Kostenlose Audio-zu-Text-Transkription mit OpenAI Whisper-Technologie. Arbeitet lokal — Ihre Daten bleiben privat.',
        'footer.navigation': 'Navigation',
        'footer.dashboard': 'Dashboard',
        'footer.howto': 'Anleitung',
        'footer.faq': 'FAQ',
        'footer.features': 'Funktionen',
        'footer.feat1': '90+ Sprachen',
        'footer.feat2': 'Export nach DOCX/XLSX',
        'footer.feat3': 'SRT-Untertitel',
        'footer.feat4': 'Zeitstempel',
        'footer.contact': 'Kontakt',
        'footer.contactDesc': 'Haben Sie Fragen oder Vorschläge?',
        'footer.copyright': '© 2025 WhisperFlow. KI-gestützte Audio-Transkription',
        'footer.made': 'Mit ❤️ für Audioarbeit gemacht'
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
        
        // Закрываем дропдаун после выбора языка
        const dropdown = document.getElementById('languageDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
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
