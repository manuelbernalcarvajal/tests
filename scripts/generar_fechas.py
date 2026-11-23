import json
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
APUNTES_DIR = BASE_DIR / "apuntes"
OUTPUT_FILE = BASE_DIR / "apuntes_fechas.json"


def obtener_fecha_git(ruta_relativa: str) -> str | None:
    """Devuelve la fecha ISO 8601 del último commit que modificó el archivo."""
    resultado = subprocess.run(
        ["git", "log", "-1", "--format=%cI", "--", ruta_relativa],
        cwd=BASE_DIR,
        capture_output=True,
        text=True,
        check=True,
    )
    fecha = resultado.stdout.strip()
    return fecha if fecha else None


def main() -> None:
    fechas: dict[str, str] = {}

    if not APUNTES_DIR.exists():
        raise FileNotFoundError(f"No se encuentra el directorio: {APUNTES_DIR}")

    for archivo in sorted(APUNTES_DIR.rglob("*.md")):
        # Ruta relativa a la raíz del repo para git log (ej: "apuntes/civil/001.md")
        ruta_repo = archivo.relative_to(BASE_DIR).as_posix()
        # Clave relativa a apuntes/ para que sea cómoda en el frontend (ej: "civil/001.md")
        clave = archivo.relative_to(APUNTES_DIR).as_posix()

        fecha = obtener_fecha_git(ruta_repo)
        if fecha:
            fechas[clave] = fecha

    with OUTPUT_FILE.open("w", encoding="utf-8") as f:
        json.dump(fechas, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Generado {OUTPUT_FILE.name} con {len(fechas)} archivos.")


if __name__ == "__main__":
    main()
