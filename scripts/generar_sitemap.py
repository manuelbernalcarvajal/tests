import json
import re
import xml.sax.saxutils as saxutils
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
APUNTES_CONFIG_FILE = BASE_DIR / "apuntes_config.js"
APUNTES_FECHAS_FILE = BASE_DIR / "apuntes_fechas.js"
LEYES_CONFIG_FILE = BASE_DIR / "leyes" / "leyes_config.js"
SITEMAP_FILE = BASE_DIR / "sitemap.xml"

# Pon aquí tu dominio definitivo (ej. https://testmaster.bcloud.es.eu.org)
BASE_URL = "https://testmaster.bcloud.es.eu.org"

PAGINAS_BASE = [
    ("index.html", "1.0", "daily"),
    ("apuntes.html", "0.9", "weekly"),
    ("leyes.html", "0.9", "daily"),
]


def js_objeto_a_json(js_snippet: str) -> str:
    """Convierte un literal de objeto/array JS sencillo a JSON válido."""
    texto = js_snippet.strip()
    # Quitar comentarios de línea //
    texto = re.sub(r"(?m)//.*$", "", texto)
    # Poner comillas dobles a claves sin comillas: { id: "x" } -> { "id": "x" }
    texto = re.sub(r"([{\[,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)", r'\1"\2"\3', texto)
    # Quitar comas finales antes de } o ]
    texto = re.sub(r",\s*([}\]])", r"\1", texto)
    return texto


def extraer_datos_js(ruta_js: Path, patron_regex: str):
    if not ruta_js.exists():
        return None
    contenido = ruta_js.read_text(encoding="utf-8", errors="ignore")
    m = re.search(patron_regex, contenido, re.DOTALL)
    if not m:
        return None
    raw = m.group(1).strip().rstrip(";")
    for candidato in (raw, js_objeto_a_json(raw)):
        try:
            return json.loads(candidato)
        except json.JSONDecodeError:
            continue
    return None


def es_tema_pendiente(tema: dict) -> bool:
    archivo = (tema.get("archivo") or "").lower()
    titulo = (tema.get("titulo") or "").lower()
    return "enproceso.md" in archivo or "/pendiente/" in titulo or not archivo


def clave_bloque_articulo(art: dict) -> str:
    partes = [
        art.get("libro"),
        art.get("tituloNorma"),
        art.get("capitulo"),
        art.get("seccion"),
    ]
    return " › ".join(str(p).strip() for p in partes if p)


def main() -> None:
    hoy_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    entradas: list[tuple[str, str, str, str]] = []
    urls_vistas: set[str] = set()

    def agregar_url(rel_path: str, lastmod: str, changefreq: str, priority: str) -> None:
        url_limpia = f"{BASE_URL.rstrip('/')}/{rel_path.lstrip('/')}"
        if url_limpia not in urls_vistas:
            urls_vistas.add(url_limpia)
            entradas.append((url_limpia, lastmod or hoy_iso, changefreq, priority))

    # 1. Páginas base
    for rel, prio, freq in PAGINAS_BASE:
        if (BASE_DIR / rel).exists():
            agregar_url(rel, hoy_iso, freq, prio)

    # 2. Fechas reales de apuntes desde apuntes_fechas.js
    fechas_apuntes = extraer_datos_js(
        APUNTES_FECHAS_FILE,
        r"window\.FECHAS_APUNTES\s*=\s*(\{.*?\})\s*;?\s*$",
    )
    if not isinstance(fechas_apuntes, dict):
        fechas_apuntes = {}

    # 3. Apuntes desde apuntes_config.js (excluyendo /pendiente/ y enproceso.md)
    apuntes_cfg = extraer_datos_js(
        APUNTES_CONFIG_FILE,
        r"(?:const|var|let)\s+APUNTES_CONFIG\s*=\s*(\[.*\])\s*;?\s*$",
    )
    if isinstance(apuntes_cfg, list):
        for asig in apuntes_cfg:
            asig_id = asig.get("id")
            for tema in asig.get("temas") or []:
                if es_tema_pendiente(tema):
                    continue
                tema_id = tema.get("id")
                archivo = (tema.get("archivo") or "").lstrip("./")
                clave_fecha = archivo.removeprefix("apuntes/")
                lastmod_tema = fechas_apuntes.get(clave_fecha) or hoy_iso

                if asig_id and tema_id:
                    agregar_url(
                        f"apuntes.html?asig={asig_id}&tema={tema_id}",
                        lastmod_tema,
                        "weekly",
                        "0.8",
                    )

    # 4. Leyes desde leyes_config.js (portada de ley + primer artículo de cada bloque)
    leyes_cfg = extraer_datos_js(
        LEYES_CONFIG_FILE,
        r"window\.LEYES_CONFIG\s*=\s*(\[.*\])\s*;?\s*$",
    )
    if isinstance(leyes_cfg, list):
        for ley in leyes_cfg:
            ley_id = ley.get("id")
            if not ley_id:
                continue
            lastmod_ley = ley.get("actualizado") or hoy_iso
            agregar_url(f"leyes.html?ley={ley_id}", lastmod_ley, "daily", "0.7")

            indice_rel = (ley.get("indiceScript") or f"leyes/{ley_id}/indice-{ley_id}.js").lstrip("./")
            indice_js = BASE_DIR / indice_rel
            indice_data = extraer_datos_js(
                indice_js,
                r"window\.INDICES_LEYES\[[^\]]+\]\s*=\s*(\{.*\})\s*;?\s*$",
            )
            if isinstance(indice_data, dict):
                bloques_vistos: set[str] = set()
                for art in indice_data.get("articulos") or []:
                    art_id = art.get("id")
                    if not art_id:
                        continue
                    bloque = clave_bloque_articulo(art)
                    clave_dedup = bloque or f"__sin_bloque_{art_id}"
                    if clave_dedup not in bloques_vistos:
                        bloques_vistos.add(clave_dedup)
                        agregar_url(
                            f"leyes.html?ley={ley_id}&art={art_id}",
                            lastmod_ley,
                            "daily",
                            "0.6",
                        )

    # 5. Generar sitemap.xml
    lineas = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for loc, lastmod, freq, prio in entradas:
        lineas.extend([
            "  <url>",
            f"    <loc>{saxutils.escape(loc)}</loc>",
            f"    <lastmod>{saxutils.escape(str(lastmod))}</lastmod>",
            f"    <changefreq>{freq}</changefreq>",
            f"    <priority>{prio}</priority>",
            "  </url>",
        ])
    lineas.append("</urlset>")

    SITEMAP_FILE.write_text("\n".join(lineas) + "\n", encoding="utf-8")
    print(f"Sitemap generado en {SITEMAP_FILE} con {len(entradas)} URLs.")


if __name__ == "__main__":
    main()
