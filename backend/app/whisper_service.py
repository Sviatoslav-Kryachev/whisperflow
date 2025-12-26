import whisper
from .utils import format_timestamp

def transcribe(audio_path, model_name):
    model = whisper.load_model(model_name)
    result = model.transcribe(audio_path)

    lines = []
    for seg in result["segments"]:
        start = format_timestamp(seg["start"])
        end = format_timestamp(seg["end"])
        text = seg["text"].strip()
        lines.append(f"[{start} --> {end}]  {text}")

    return "\n".join(lines)
