/**
 * Speech Recognition Module
 * Использует Web Speech API для распознавания речи в реальном времени
 */

class SpeechRecognitionManager {
    constructor() {
        this.recognition = null;
        this.isRecording = false;
        this.onResultCallback = null;
        this.onErrorCallback = null;
        this.onStartCallback = null;
        this.onEndCallback = null;
        this.interimResults = [];
        this.finalResults = [];
        
        this.init();
    }
    
    init() {
        // Проверяем поддержку Web Speech API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.error("Web Speech API не поддерживается в этом браузере");
            return false;
        }
        
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'de-DE'; // По умолчанию немецкий
        
        // Обработчики событий
        this.recognition.onstart = () => {
            this.isRecording = true;
            this.interimResults = [];
            this.finalResults = [];
            if (this.onStartCallback) this.onStartCallback();
        };
        
        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                    this.finalResults.push(transcript);
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Вызываем callback с результатами
            if (this.onResultCallback) {
                this.onResultCallback({
                    interim: interimTranscript,
                    final: finalTranscript.trim(),
                    isFinal: event.results[event.results.length - 1].isFinal
                });
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (this.onErrorCallback) {
                this.onErrorCallback(event.error);
            }
        };
        
        this.recognition.onend = () => {
            this.isRecording = false;
            if (this.onEndCallback) {
                this.onEndCallback();
            }
        };
        
        return true;
    }
    
    setLanguage(language) {
        // Маппинг языков для Web Speech API
        const langMap = {
            'de': 'de-DE',
            'en': 'en-US',
            'fr': 'fr-FR',
            'es': 'es-ES'
        };
        
        if (this.recognition) {
            this.recognition.lang = langMap[language] || 'de-DE';
        }
    }
    
    start() {
        if (!this.recognition) {
            console.error('Speech recognition не инициализирован');
            return false;
        }
        
        if (this.isRecording) {
            console.warn('Запись уже идёт');
            return false;
        }
        
        try {
            this.recognition.start();
            return true;
        } catch (error) {
            console.error('Ошибка запуска распознавания:', error);
            return false;
        }
    }
    
    stop() {
        if (!this.recognition || !this.isRecording) {
            return;
        }
        
        try {
            this.recognition.stop();
        } catch (error) {
            console.error('Ошибка остановки распознавания:', error);
        }
    }
    
    abort() {
        if (!this.recognition) {
            return;
        }
        
        try {
            this.recognition.abort();
        } catch (error) {
            console.error('Ошибка прерывания распознавания:', error);
        }
    }
    
    onResult(callback) {
        this.onResultCallback = callback;
    }
    
    onError(callback) {
        this.onErrorCallback = callback;
    }
    
    onStart(callback) {
        this.onStartCallback = callback;
    }
    
    onEnd(callback) {
        this.onEndCallback = callback;
    }
    
    isSupported() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }
}

// Глобальный экземпляр
window.speechRecognitionManager = new SpeechRecognitionManager();

 * Speech Recognition Module
 * Использует Web Speech API для распознавания речи в реальном времени
 */

class SpeechRecognitionManager {
    constructor() {
        this.recognition = null;
        this.isRecording = false;
        this.onResultCallback = null;
        this.onErrorCallback = null;
        this.onStartCallback = null;
        this.onEndCallback = null;
        this.interimResults = [];
        this.finalResults = [];
        
        this.init();
    }
    
    init() {
        // Проверяем поддержку Web Speech API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.error("Web Speech API не поддерживается в этом браузере");
            return false;
        }
        
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'de-DE'; // По умолчанию немецкий
        
        // Обработчики событий
        this.recognition.onstart = () => {
            this.isRecording = true;
            this.interimResults = [];
            this.finalResults = [];
            if (this.onStartCallback) this.onStartCallback();
        };
        
        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                    this.finalResults.push(transcript);
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Вызываем callback с результатами
            if (this.onResultCallback) {
                this.onResultCallback({
                    interim: interimTranscript,
                    final: finalTranscript.trim(),
                    isFinal: event.results[event.results.length - 1].isFinal
                });
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (this.onErrorCallback) {
                this.onErrorCallback(event.error);
            }
        };
        
        this.recognition.onend = () => {
            this.isRecording = false;
            if (this.onEndCallback) {
                this.onEndCallback();
            }
        };
        
        return true;
    }
    
    setLanguage(language) {
        // Маппинг языков для Web Speech API
        const langMap = {
            'de': 'de-DE',
            'en': 'en-US',
            'fr': 'fr-FR',
            'es': 'es-ES'
        };
        
        if (this.recognition) {
            this.recognition.lang = langMap[language] || 'de-DE';
        }
    }
    
    start() {
        if (!this.recognition) {
            console.error('Speech recognition не инициализирован');
            return false;
        }
        
        if (this.isRecording) {
            console.warn('Запись уже идёт');
            return false;
        }
        
        try {
            this.recognition.start();
            return true;
        } catch (error) {
            console.error('Ошибка запуска распознавания:', error);
            return false;
        }
    }
    
    stop() {
        if (!this.recognition || !this.isRecording) {
            return;
        }
        
        try {
            this.recognition.stop();
        } catch (error) {
            console.error('Ошибка остановки распознавания:', error);
        }
    }
    
    abort() {
        if (!this.recognition) {
            return;
        }
        
        try {
            this.recognition.abort();
        } catch (error) {
            console.error('Ошибка прерывания распознавания:', error);
        }
    }
    
    onResult(callback) {
        this.onResultCallback = callback;
    }
    
    onError(callback) {
        this.onErrorCallback = callback;
    }
    
    onStart(callback) {
        this.onStartCallback = callback;
    }
    
    onEnd(callback) {
        this.onEndCallback = callback;
    }
    
    isSupported() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }
}

// Глобальный экземпляр
window.speechRecognitionManager = new SpeechRecognitionManager();


