import os
import re
import subprocess
from pathlib import Path

VOICE = "es-ES-AlvaroNeural" # o es-ES-ElviraNeural
INPUT_DIR = Path("apuntes")
OUTPUT_DIR = Path("audios")

def clean_markdown(text: str) -> str:
    # Quitar identificadores ECLI repetitivos o simplificarlos
    text = re.sub(r'ECLI:ES:TS:(\d+):(\d+)', r'Sentencia del Tribunal Supremo de \1', text)
    text = re.sub(r'ECLI:ES:AP[A-Z]+:(\d+):(\d+)', r'Sentencia de Audiencia Provincial', text)
    # Quitar sintaxis markdown
    text = re.sub(r'#+\s*', '', text)
    text = re.sub(r'\*{1,2}([^*]+)\*{1,2}', r'\1', text)
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    text = re.sub(r'\(ECLI:[^)]+\)', '', text)
    return text.strip()

def process_file(md_path: Path):
    rel_path = md_path.relative_to(INPUT_DIR)
    target_mp3 = OUTPUT_DIR / rel_path.with_suffix(".mp3")
    target_vtt = OUTPUT_DIR / rel_path.with_suffix(".vtt")

    target_mp3.parent.mkdir(parents=True, exist_ok=True)

    raw_temp_mp3 = target_mp3.with_suffix(".raw.mp3")

    with open(md_path, "r", encoding="utf-8") as f:
        clean_text = clean_markdown(f.read())

    temp_txt = md_path.with_suffix(".txt.tmp")
    with open(temp_txt, "w", encoding="utf-8") as f:
        f.write(clean_text)

    # 1. Generar audio y subtítulos sincronizados
    cmd_tts = [
        "edge-tts",
        "--voice", VOICE,
        "-f", str(temp_txt),
        "--write-media", str(raw_temp_mp3),
        "--write-subtitles", str(target_vtt)
    ]
    subprocess.run(cmd_tts, check=True)

    # 2. Compresión máxima con FFmpeg (Mono, 32k, 22kHz)
    cmd_ffmpeg = [
        "ffmpeg", "-y",
        "-i", str(raw_temp_mp3),
        "-ac", "1",
        "-ar", "22050",
        "-b:a", "32k",
        str(target_mp3)
    ]
    subprocess.run(cmd_ffmpeg, check=True)

    # Limpieza de archivos temporales
    if temp_txt.exists(): temp_txt.unlink()
    if raw_temp_mp3.exists(): raw_temp_mp3.unlink()
    print(f"Generado: {target_mp3} y {target_vtt}")

if __name__ == "__main__":
    for md_file in INPUT_DIR.rglob("*.md"):
        process_file(md_file)
