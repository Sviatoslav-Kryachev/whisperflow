# Fix OpenMP conflict: установить переменную окружения ДО импорта torch/faster-whisper
import os
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

from faster_whisper import WhisperModel
from .utils import format_timestamp
from typing import Callable, Optional
import tempfile
from pathlib import Path
import uuid
import torch
import logging

logger = logging.getLogger(__name__)

# Определяем устройство (GPU если доступно, иначе CPU)
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
COMPUTE_TYPE = "float16" if torch.cuda.is_available() else "int8"

# Кэш для модели (чтобы не загружать каждый раз)
_model_cache = {}


def _get_model(model_name: str):
    """Получить модель из кэша или загрузить новую"""
    if model_name not in _model_cache:
        logger.info(f"Loading model {model_name} on {DEVICE} with compute_type={COMPUTE_TYPE}")
        # Маппинг имен моделей: openai/whisper-large-v3 -> large-v3
        if model_name.startswith("openai/whisper-"):
            model_name = model_name.replace("openai/whisper-", "")
        elif model_name.startswith("whisper-"):
            model_name = model_name.replace("whisper-", "")
        
        _model_cache[model_name] = WhisperModel(
            model_name,
            device=DEVICE,
            compute_type=COMPUTE_TYPE
        )
        logger.info(f"Model {model_name} loaded successfully")
    return _model_cache[model_name]


def transcribe(audio_path, model_name, language=None):
    """Простая транскрипция с опциональным указанием языка"""
    source = Path(audio_path)
    
    # Проверяем, нужно ли копировать (если путь уже temp - не копируем)
    temp_dir = tempfile.gettempdir()
    if str(source).startswith(temp_dir):
        # Файл уже во временной папке
        safe_path = str(source)
        need_cleanup = False
    else:
        # Копируем во временную папку
        ext = source.suffix.lower()
        temp_path = Path(temp_dir) / f"wf_{uuid.uuid4().hex}{ext}"
        temp_path.write_bytes(source.read_bytes())
        safe_path = str(temp_path)
        need_cleanup = True
    
    try:
        model = _get_model(model_name)
        
        # Оптимизированные параметры для быстрой обработки
        segments, info = model.transcribe(
            safe_path,
            beam_size=1,  # Быстрый поиск (вместо 5)
            language=language,  # Язык если указан
            vad_filter=True,  # Фильтрация тишины (ускоряет обработку)
            vad_parameters=dict(
                min_silence_duration_ms=500  # Минимальная длительность тишины
            ),
            condition_on_previous_text=False,  # Не зависит от предыдущего текста (быстрее)
            compression_ratio_threshold=2.4,
            log_prob_threshold=-1.0,
            no_speech_threshold=0.6,
            word_timestamps=True  # Для форматирования с таймкодами
        )

        lines = []
        for seg in segments:
            start = format_timestamp(seg.start)
            end = format_timestamp(seg.end)
            text = seg.text.strip()
            lines.append(f"[{start} --> {end}]  {text}")

        return "\n".join(lines)
    finally:
        if need_cleanup:
            try:
                os.remove(safe_path)
            except:
                pass


def transcribe_with_progress(audio_path: str, model_name: str, 
                              language: Optional[str] = None,
                              progress_callback: Optional[Callable[[float, str], None]] = None):
    """Транскрибирует аудио с отслеживанием прогресса"""
    # Файл уже должен быть во временной папке (скопирован в tasks.py)
    safe_path = audio_path
    
    try:
        if progress_callback:
            progress_callback(5.0, "Подготовка...")
        
        file_size = os.path.getsize(safe_path)
        file_size_mb = file_size / (1024 * 1024)
        
        if progress_callback:
            progress_callback(10.0, f"Загрузка модели {model_name}...")
        
        model = _get_model(model_name)
        
        if progress_callback:
            progress_callback(25.0, "Модель загружена...")
        
        if progress_callback:
            device_info = f"GPU ({DEVICE})" if DEVICE == "cuda" else "CPU"
            lang_msg = f" ({language})" if language else " (авто)"
            progress_callback(30.0, f"Распознавание на {device_info}{lang_msg} ({file_size_mb:.1f} МБ)...")
        
        # Оптимизированные параметры для быстрой обработки
        segments, info = model.transcribe(
            safe_path,
            beam_size=1,  # Быстрый поиск
            language=language,  # Язык если указан
            vad_filter=True,  # Фильтрация тишины
            vad_parameters=dict(
                min_silence_duration_ms=500
            ),
            condition_on_previous_text=False,
            compression_ratio_threshold=2.4,
            log_prob_threshold=-1.0,
            no_speech_threshold=0.6,
            word_timestamps=True
        )
        
        if progress_callback:
            progress_callback(50.0, "Обработка сегментов...")
        
        lines = []
        segment_count = 0
        
        # Обрабатываем генератор сегментов
        for seg in segments:
            start = format_timestamp(seg.start)
            end = format_timestamp(seg.end)
            text = seg.text.strip()
            lines.append(f"[{start} --> {end}]  {text}")
            segment_count += 1
            
            # Обновляем прогресс каждые 10 сегментов
            if progress_callback and segment_count % 10 == 0:
                progress = min(50.0 + (segment_count * 0.5), 90.0)
                progress_callback(progress, f"Обработано сегментов: {segment_count}...")
        
        if progress_callback:
            progress_callback(90.0, "Форматирование...")
        
        return "\n".join(lines)
    
    except Exception as e:
        logger.error(f"Transcription error: {e}", exc_info=True)
        raise
