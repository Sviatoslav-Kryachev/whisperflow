import whisper
from .utils import format_timestamp
from typing import Callable, Optional
import tempfile
from pathlib import Path
import uuid
import os


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
        model = whisper.load_model(model_name)
        
        # Параметры транскрипции
        transcribe_options = {}
        if language:
            transcribe_options['language'] = language
        
        result = model.transcribe(safe_path, **transcribe_options)

        lines = []
        for seg in result["segments"]:
            start = format_timestamp(seg["start"])
            end = format_timestamp(seg["end"])
            text = seg["text"].strip()
            lines.append(f"[{start} --> {end}]  {text}")

        return "\n".join(lines)
    finally:
        if need_cleanup:
            try:
                os.remove(safe_path)
            except:
                pass


def transcribe_with_progress(audio_path: str, model_name: str, 
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
        
        model = whisper.load_model(model_name)
        
        if progress_callback:
            progress_callback(25.0, "Модель загружена...")
        
        if progress_callback:
            progress_callback(30.0, f"Распознавание ({file_size_mb:.1f} МБ)...")
        
        result = model.transcribe(safe_path, verbose=False)
        
        if progress_callback:
            progress_callback(90.0, "Форматирование...")
        
        segments = result.get("segments", [])
        lines = []
        for seg in segments:
            start = format_timestamp(seg["start"])
            end = format_timestamp(seg["end"])
            text = seg["text"].strip()
            lines.append(f"[{start} --> {end}]  {text}")
        
        return "\n".join(lines)
    
    except Exception as e:
        raise
