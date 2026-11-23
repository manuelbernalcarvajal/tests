import json
import re
import xml.sax.saxutils as saxutils
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
APUNTES_CONFIG_FILE = BASE_DIR / "apuntes_config.js"
LEYES_CONFIG_FILE = BASE_DIR / "leyes" / "leyes_config.js"
LEYES_DIR = BASE_DIR / "leyes"
SITEMAP_FILE = BASE_DIR / "sitemap.xml"

# Ajusta aquí tu URL base si cambia el dominio
BASE_URL = "https://testmaster.bcloud.es.org"

# Páginas principales estáticas del portal
PAGINAS_BASE = [
    ("index.html", "1.0", "daily"),
    ("apuntes.html", "0.9", "weekly"),
    ("leyes.html", "0.9", "weekly"),
]


def extraer_json_de_js(ruta_js: Path, patron_regex: str):
    if not ruta_js.exists():
        return None
    contenido = ruta_js.read_text(encoding="utf-8", errors="ignore")
    m = re.search(patron_regex, contenido, re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return None


def main() -> None:
    fecha_hoy = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    entradas: list[tuple[str, str, str, str]] = []  # (url, lastmod, changefreq, priority)
    urls_vistas: set[str] = set()

    def agregar_url(rel_path: str, lastmod: str, changefreq: str, priority: str) -> None:
        url_limpia = f"{BASE_URL.rstrip('/')}/{rel_path.lstrip('/')}"
        if url_limpia not in urls_vistas:
            urls_vistas.add(url_limpia)
            entradas.append((url_limpia, lastmod, changefreq, priority))

    # 1. Páginas base
    for rel, prio, freq in PAGINAS_BASE:
        if (BASE_DIR / rel).exists():
            agregar_url(rel, fecha_hoy, freq, prio)

    # 2. Rutas de apuntes desde apuntes_config.js
    apuntes_cfg = extraer_json_de_js(
        APUNTES_CONFIG_FILE,
        r"(?:const|var|let)\s+APUNTES_CONFIG\s*=\s*(\[.*\]);\s*$",
    )
    if isinstance(apuntes_cfg, list):
        for asig in apuntes_cfg:
            asig_id = asig.get("id")
            temas = asig.get("temas") or []
            for tema in temas:
                tema_id = tema.get("id")
                if asig_id and tema_id:
                    rel = f"apuntes.html?asig={asig_id}&tema={tema_id}"
                    agregar_url(rel, fecha_hoy, "weekly", "0.8")

    # 3. Rutas de leyes y artículos desde leyes/leyes_config.js e indice-*.js
    leyes_cfg = extraer_json_de_js(
        LEYES_CONFIG_FILE,
        r"window\.LEYES_CONFIG\s*=\s*(\[.*\]);\s*$",
    )
    if isinstance(leyes_cfg, list):
        for ley in leyes_cfg:
            ley_id = ley.get("id")
            if not ley_id:
                continue
            actualizado_ley = ley.get("actualizado") or fecha_hoy
            agregar_url(f"leyes.html?ley={ley_id}", actualizado_ley, "weekly", "0.7")

            indice_js = LEYES_DIR / ley_id / f"indice-{ley_id}.js"
            indice_data = extraer_json_de_js(
                indice_js,
                r"window\.INDICES_LEYES\[[^\]]+\]\s*=\s*(\{.*\});\s*$",
            )
            if isinstance(indice_data, dict):
                for art in indice_data.get("articulos") or []:
                    art_id = art.get("id")
                    if art_id:
                        agregar_url(
                            f"leyes.html?ley={ley_id}&art={art_id}",
                            actualizado_ley,
                            "monthly",
                            "0.6",
                        )

    # 4. Escribir sitemap.xml válido
    lineas = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for loc, lastmod, freq, prio in entradas:
        loc_xml = saxutils.escape(loc)
        lineas.append("  <url>")
        lineas.append(f"    <loc>{loc_xml}</loc>")
        lineas.append(f"    <lastmod>{lastmod}</lastmod>")
        lineas.append(f"    <changefreq>{freq}</changefreq>")
        lineas.append(f"    <priority>{prio}</priority>")
        lineas.append("  </url>")
    lineas.append("</urlset>")

    SITEMAP_FILE.write_text("\n".join(lineas) + "\n", encoding="utf-8")
    print(f"Sitemap generado en {SITEMAP_FILE} con {len(entradas)} URLs.")


if __name__ == "__main__":
    main()
