import json
import re
import xml.sax.saxutils as saxutils
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

BASE_DIR = Path(__file__).resolve().parent.parent
APUNTES_CONFIG_FILE = BASE_DIR / "apuntes_config.js"
APUNTES_FECHAS_FILE = BASE_DIR / "apuntes_fechas.js"
LEYES_CONFIG_FILE = BASE_DIR / "leyes" / "leyes_config.js"
SITEMAP_FILE = BASE_DIR / "sitemap.xml"

BASE_URL = "https://testmaster.bcloud.es.eu.org"

PAGINAS_BASE = [
    "index.html",
    "apuntes.html",
    "leyes.html",
]

FECHA_ISO_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})")


def normalizar_fecha_ymd(valor: object, fallback: str) -> str:
    """Devuelve YYYY-MM-DD limpio, formato preferido y sin ambigüedades para Sitemaps."""
    if isinstance(valor, str):
        m = FECHA_ISO_RE.match(valor.strip())
        if m:
            return m.group(1)
    return fallback


def fecha_archivo_disco(ruta: Path, fallback: str) -> str:
    if not ruta.exists():
        return fallback
    return datetime.fromtimestamp(ruta.stat().st_mtime, tz=timezone.utc).strftime("%Y-%m-%d")


def extraer_bloque_balanceado(texto: str, inicio: int) -> str | None:
    if inicio < 0 or inicio >= len(texto):
        return None
    apertura = texto[inicio]
    if apertura not in ("{", "["):
        return None
    cierre = "}" if apertura == "{" else "]"

    profundidad = 0
    en_comilla: str | None = None
    escapado = False

    for idx in range(inicio, len(texto)):
        ch = texto[idx]
        if en_comilla:
            if escapado:
                escapado = False
            elif ch == "\\":
                escapado = True
            elif ch == en_comilla:
                en_comilla = None
            continue

        if ch in ('"', "'", "`"):
            en_comilla = ch
        elif ch == apertura:
            profundidad += 1
        elif ch == cierre:
            profundidad -= 1
            if profundidad == 0:
                return texto[inicio : idx + 1]
    return None


def js_literal_a_json(literal: str) -> str:
    texto = re.sub(r"(?m)^\s*//.*$", "", literal)
    texto = re.sub(r"([{\[,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)", r'\1"\2"\3', texto)
    texto = re.sub(r",\s*([}\]])", r"\1", texto)
    return texto


def extraer_datos_js(ruta_js: Path, patron_asignacion: str):
    if not ruta_js.exists():
        return None
    contenido = ruta_js.read_text(encoding="utf-8", errors="ignore")
    contenido_limpio = re.sub(r"/\*.*?\*/", "", contenido, flags=re.DOTALL)

    m = re.search(patron_asignacion, contenido_limpio, re.DOTALL)
    if not m:
        return None

    pos_literal = m.end() - 1
    if contenido_limpio[pos_literal] not in ("{", "["):
        busqueda = re.search(r"[\{\[]", contenido_limpio[m.start() :])
        if not busqueda:
            return None
        pos_literal = m.start() + busqueda.start()

    bloque = extraer_bloque_balanceado(contenido_limpio, pos_literal)
    if not bloque:
        return None

    for candidato in (bloque, js_literal_a_json(bloque)):
        try:
            return json.loads(candidato)
        except json.JSONDecodeError:
            continue
    return None


def es_tema_pendiente(tema: dict) -> bool:
    archivo = (tema.get("archivo") or "").strip().lower()
    titulo = (tema.get("titulo") or "").strip().lower()
    return not archivo or "enproceso.md" in archivo or "/pendiente/" in titulo


def clave_capitulo_articulo(art: dict) -> str:
    """Agrupa estrictamente por capítulo (o título/libro si la norma no tiene capítulos)."""
    for campo in ("capitulo", "tituloNorma", "libro"):
        valor = (art.get(campo) or "").strip()
        if valor:
            return f"{campo}:{valor}"
    art_id = (art.get("id") or "").strip()
    return f"__sin_capitulo_{art_id}"


def construir_xml(entradas: list[tuple[str, str]]) -> str:
    lineas = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for loc, lastmod in entradas:
        lineas.extend([
            "  <url>",
            f"    <loc>{saxutils.escape(loc)}</loc>",
            f"    <lastmod>{saxutils.escape(lastmod)}</lastmod>",
            "  </url>",
        ])
    lineas.append("</urlset>")
    return "\n".join(lineas) + "\n"


def main() -> None:
    hoy_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    entradas: list[tuple[str, str]] = []
    urls_vistas: set[str] = set()
    base = BASE_URL.rstrip("/")

    def agregar_url(rel_path: str, lastmod: object) -> None:
        url_limpia = f"{base}/{rel_path.lstrip('/')}"
        if url_limpia in urls_vistas:
            return
        urls_vistas.add(url_limpia)
        entradas.append((url_limpia, normalizar_fecha_ymd(lastmod, hoy_iso)))

    # 1. Páginas base
    for rel in PAGINAS_BASE:
        ruta_pag = BASE_DIR / rel
        if ruta_pag.exists():
            agregar_url(rel, fecha_archivo_disco(ruta_pag, hoy_iso))

    # 2. Fechas reales de apuntes (generadas desde git log en apuntes_fechas.js)
    fechas_apuntes = extraer_datos_js(
        APUNTES_FECHAS_FILE,
        r"window\.FECHAS_APUNTES\s*=\s*\{",
    )
    if not isinstance(fechas_apuntes, dict):
        fechas_apuntes = {}

    # 3. Apuntes publicados (1 URL por tema publicado)
    apuntes_cfg = extraer_datos_js(
        APUNTES_CONFIG_FILE,
        r"(?:const|var|let)\s+APUNTES_CONFIG\s*=\s*\[",
    )
    if isinstance(apuntes_cfg, list):
        for asig in apuntes_cfg:
            if not isinstance(asig, dict):
                continue
            asig_id = (asig.get("id") or "").strip()
            if not asig_id:
                continue
            for tema in asig.get("temas") or []:
                if not isinstance(tema, dict) or es_tema_pendiente(tema):
                    continue
                tema_id = (tema.get("id") or "").strip()
                if not tema_id:
                    continue
                archivo = (tema.get("archivo") or "").lstrip("./")
                clave_fecha = archivo.removeprefix("apuntes/")
                lastmod_tema = fechas_apuntes.get(clave_fecha) or fecha_archivo_disco(
                    BASE_DIR / archivo, hoy_iso
                )

                agregar_url(
                    f"apuntes.html?asig={quote(asig_id)}&tema={quote(tema_id)}",
                    lastmod_tema,
                )

    # 4. Leyes (portada de ley + 1er artículo de cada capítulo como semilla)
    leyes_cfg = extraer_datos_js(
        LEYES_CONFIG_FILE,
        r"window\.LEYES_CONFIG\s*=\s*\[",
    )
    if isinstance(leyes_cfg, list):
        for ley in leyes_cfg:
            if not isinstance(ley, dict):
                continue
            ley_id = (ley.get("id") or "").strip()
            if not ley_id:
                continue
            lastmod_ley = ley.get("actualizado") or hoy_iso
            agregar_url(f"leyes.html?ley={quote(ley_id)}", lastmod_ley)

            indice_rel = (
                ley.get("indiceScript") or f"leyes/{ley_id}/indice-{ley_id}.js"
            ).lstrip("./")
            indice_js = BASE_DIR / indice_rel
            indice_data = extraer_datos_js(
                indice_js,
                r"window\.INDICES_LEYES\[[^\]]+\]\s*=\s*\{",
            )
            if isinstance(indice_data, dict):
                capitulos_vistos: set[str] = set()
                for art in indice_data.get("articulos") or []:
                    if not isinstance(art, dict):
                        continue
                    art_id = (art.get("id") or "").strip()
                    if not art_id:
                        continue
                    cap_key = clave_capitulo_articulo(art)
                    if cap_key not in capitulos_vistos:
                        capitulos_vistos.add(cap_key)
                        agregar_url(
                            f"leyes.html?ley={quote(ley_id)}&art={quote(art_id)}",
                            lastmod_ley,
                        )

    nuevo_xml = construir_xml(entradas)
    xml_actual = SITEMAP_FILE.read_text(encoding="utf-8") if SITEMAP_FILE.exists() else None

    if nuevo_xml != xml_actual:
        tmp_file = SITEMAP_FILE.with_suffix(".xml.tmp")
        tmp_file.write_text(nuevo_xml, encoding="utf-8")
        tmp_file.replace(SITEMAP_FILE)
        print(f"Sitemap actualizado en {SITEMAP_FILE} con {len(entradas)} URLs.")
    else:
        print(f"Sitemap sin cambios ({len(entradas)} URLs).")


if __name__ == "__main__":
    main()
