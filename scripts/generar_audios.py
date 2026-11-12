import argparse
import re
import subprocess
from pathlib import Path

VOICE = "es-ES-AlvaroNeural"  # o es-ES-ElviraNeural
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


def process_file(md_path: Path, force: bool = False):
    if not md_path.exists():
        print(f"Omitido (no existe): {md_path}")
        return

    rel_path = md_path.relative_to(INPUT_DIR)
    target_mp3 = OUTPUT_DIR / rel_path.with_suffix(".mp3")
    target_vtt = OUTPUT_DIR / rel_path.with_suffix(".vtt")

    # Si no se fuerza y ambos archivos de salida ya existen, omitir
    if not force and target_mp3.exists() and target_vtt.exists():
        print(f"Omitido (ya generado): {target_mp3}")
        return

    target_mp3.parent.mkdir(parents=True, exist_ok=True)
    raw_temp_mp3 = target_mp3.with_suffix(".raw.mp3")
    temp_txt = md_path.with_suffix(".txt.tmp")

    print(f"Procesando: {md_path} -> {target_mp3}")

    try:
        with open(md_path, "r", encoding="utf-8") as f:
            clean_text = clean_markdown(f.read())

        with open(temp_txt, "w", encoding="utf-8") as f:
            f.write(clean_text)

        # 1. Generar audio y subtítulos sincronizados
        cmd_tts = [
            "edge-tts",
            "--voice", VOICE,
            "-f", str(temp_txt),
            "--write-media", str(raw_temp_mp3),
            "--write-subtitles", str(target_vtt),
        ]
        subprocess.run(cmd_tts, check=True)

        # 2. Compresión máxima con FFmpeg (Mono, 32k, 22kHz) con salida limpia
        cmd_ffmpeg = [
            "ffmpeg", "-y",
            "-hide_banner",
            "-loglevel", "error",
            "-i", str(raw_temp_mp3),
            "-ac", "1",
            "-ar", "22050",
            "-b:a", "32k",
            str(target_mp3),
        ]
        subprocess.run(cmd_ffmpeg, check=True)

        print(f"Completado: {target_mp3} y {target_vtt}")

    finally:
        # Limpieza garantizada incluso si falla algún comando
        if temp_txt.exists():
            temp_txt.unlink()
        if raw_temp_mp3.exists():
            raw_temp_mp3.unlink()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Genera audios MP3 y subtítulos VTT desde Markdown.")
    parser.add_argument(
        "files",
        nargs="*",
        help="Rutas específicas de archivos .md a procesar. Si se omite, recorre toda la carpeta apuntes/."
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Fuerza la regeneración aunque el .mp3 y .vtt ya existan."
    )
    args = parser.parse_args()

    if args.files:
        md_files = [Path(f) for f in args.files if f.endswith(".md")]
    else:
        md_files = sorted(INPUT_DIR.rglob("*.md"))

    print(f"Total de archivos a evaluar: {len(md_files)}")
    for md_file in md_files:
        process_file(md_file, force=args.force)
