import hashlib
import json
import re
import time
import unicodedata
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from bs4 import BeautifulSoup

BASE_DIR = Path(__file__).resolve().parent.parent
LEYES_DIR = BASE_DIR / "leyes"
LISTA_FILE = LEYES_DIR / "lista_leyes.txt"
CONFIG_JS_FILE = LEYES_DIR / "leyes_config.js"

MARCADOR_HISTORIAL = "<!-- HISTORIAL_BOE -->"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; EstudioJuridicoMBC/1.0; +https://github.com)"
}


def slugify(texto: str) -> str:
    texto = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii")
    texto = re.sub(r"[^a-zA-Z0-9]+", "-", texto.lower()).strip("-")
    return texto or "ley"


def slug_articulo(encabezado: str) -> str:
    """Convierte 'Artículo 588 bis a. Principios rectores.' en 'art-588-bis-a'."""
    m = re.search(
        r"(?:art[íi]culo|art\.?)\s+(\d+(?:\s+(?:bis|ter|quater|quinquies|sexies|septies|octies|novies|decies|[a-z]))?)",
        encabezado,
        re.IGNORECASE,
    )
    if m:
        parte = slugify(m.group(1))
        return f"art-{parte}"
    limpio = encabezado.strip().rstrip(".")
    return slugify(limpio)[:50]


def descargar_html(url: str) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        charset = resp.headers.get_content_charset() or "utf-8"
        return resp.read().decode(charset, errors="replace")


def limpiar_texto(el) -> str:
    return " ".join(el.get_text(" ", strip=True).split())


def extraer_articulos_boe(html: str) -> list[dict]:
    """
    Parsea el HTML consolidado del BOE manteniendo la jerarquía
    (Libro, Título, Capítulo, Sección) para cada artículo.
    """
    soup = BeautifulSoup(html, "html.parser")
    articulos = []

    jerarquia = {
        "libro": "",
        "titulo": "",
        "capitulo": "",
        "seccion": "",
    }

    bloques = soup.select("div.bloque")

    for bloque in bloques:
        libro_el = bloque.find(["h3", "h4"], class_=re.compile(r"libro", re.I))
        if libro_el:
            jerarquia["libro"] = limpiar_texto(libro_el)
            jerarquia["titulo"] = ""
            jerarquia["capitulo"] = ""
            jerarquia["seccion"] = ""

        tit_num = bloque.find(["h3", "h4"], class_=re.compile(r"titulo_num", re.I))
        tit_nom = bloque.find(["h3", "h4"], class_=re.compile(r"titulo_tit", re.I))
        if tit_num or tit_nom:
            partes = [limpiar_texto(x) for x in (tit_num, tit_nom) if x]
            jerarquia["titulo"] = " — ".join(partes)
            jerarquia["capitulo"] = ""
            jerarquia["seccion"] = ""

        cap_num = bloque.find(["h3", "h4"], class_=re.compile(r"capitulo_num", re.I))
        cap_nom = bloque.find(["h3", "h4"], class_=re.compile(r"capitulo_tit", re.I))
        if cap_num or cap_nom:
            partes = [limpiar_texto(x) for x in (cap_num, cap_nom) if x]
            jerarquia["capitulo"] = " — ".join(partes)
            jerarquia["seccion"] = ""

        sec_el = bloque.find(["h3", "h4", "h5"], class_=re.compile(r"seccion", re.I))
        if sec_el:
            jerarquia["seccion"] = limpiar_texto(sec_el)

        titulo_el = bloque.find(["h6", "h5", "h4", "h3"], class_=re.compile(r"articulo", re.I))
        if not titulo_el:
            titulo_el = bloque.find(["h6", "h5", "h4", "h3"])
        if not titulo_el:
            continue

        titulo = limpiar_texto(titulo_el)
        if not re.match(r"^(?:art[íi]culo|art\.?)\b", titulo, re.IGNORECASE):
            continue

        nota_mod = ""
        for pie in bloque.select("p.pie_unico, p.nota"):
            txt_pie = limpiar_texto(pie)
            if txt_pie and any(k in txt_pie.lower() for k in ("modifica", "añade", "redacción", "deroga")):
                nota_mod = txt_pie
                break

        for ruido in bloque.select(".notas, .bloque-notas, a.jurisprudencia, span.referencia"):
            ruido.decompose()

        lineas_md = [f"# {titulo}", ""]

        for hijo in bloque.find_all(["p", "li", "blockquote"], recursive=True):
            if hijo.name == "p" and hijo.find_parent(["li", "blockquote"]):
                continue

            texto = limpiar_texto(hijo)
            if not texto:
                continue

            clases = hijo.get("class") or []
            if "pie_unico" in clases or "nota" in clases:
                continue

            if hijo.name == "li":
                lineas_md.append(f"- {texto}")
            elif hijo.name == "blockquote":
                lineas_md.append(f"> {texto}")
            else:
                lineas_md.append(texto)
            lineas_md.append("")

        cuerpo_md = "\n".join(lineas_md).strip()
        if len(cuerpo_md) <= len(titulo) + 4:
            continue

        slug = slug_articulo(titulo)
        articulos.append({
            "slug": slug,
            "titulo": titulo,
            "markdown": cuerpo_md,
            "libro": jerarquia["libro"],
            "tituloNorma": jerarquia["titulo"],
            "capitulo": jerarquia["capitulo"],
            "seccion": jerarquia["seccion"],
            "notaMod": nota_mod,
        })

    vistos: dict[str, int] = {}
    for art in articulos:
        base = art["slug"]
        if base in vistos:
            vistos[base] += 1
            art["slug"] = f"{base}-{vistos[base]}"
        else:
            vistos[base] = 1

    return articulos


def normalizar_hash(texto: str) -> str:
    limpio = re.sub(r"\s+", " ", texto).strip()
    return hashlib.sha256(limpio.encode("utf-8")).hexdigest()


def guardar_articulo_con_historial(
    ruta_md: Path, nuevo_md: str, fecha_hoy: str, nota_mod: str = ""
) -> tuple[bool, bool]:
    if not ruta_md.exists():
        ruta_md.write_text(nuevo_md + "\n", encoding="utf-8")
        return True, False

    contenido_actual = ruta_md.read_text(encoding="utf-8")
    if MARCADOR_HISTORIAL in contenido_actual:
        vigente_anterior, historial_previo = contenido_actual.split(MARCADOR_HISTORIAL, 1)
        vigente_anterior = vigente_anterior.strip()
        historial_previo = historial_previo.strip()
    else:
        vigente_anterior = contenido_actual.strip()
        historial_previo = ""

    if normalizar_hash(vigente_anterior) == normalizar_hash(nuevo_md):
        return False, bool(historial_previo)

    detalle_boe = f" — Nota BOE: {nota_mod}" if nota_mod else ""
    entrada_historial = (
        f"### Anterior (redacción derogada/modificada aprox. el {fecha_hoy}{detalle_boe})\n\n"
        f"{vigente_anterior}"
    )

    if historial_previo:
        nuevo_historial = f"{entrada_historial}\n\n---\n\n{historial_previo}"
    else:
        nuevo_historial = (
            "## 📜 Historial de redacciones anteriores\n\n"
            f"{entrada_historial}"
        )

    final_md = f"{nuevo_md}\n\n{MARCADOR_HISTORIAL}\n\n{nuevo_historial}\n"
    ruta_md.write_text(final_md, encoding="utf-8")
    return True, True


def leer_lista_leyes() -> list[tuple[str, str]]:
    if not LISTA_FILE.exists():
        raise FileNotFoundError(f"No existe {LISTA_FILE}")

    leyes = []
    for linea in LISTA_FILE.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "|" not in linea:
            continue
        nombre, url = [p.strip() for p in linea.split("|", 1)]
        if nombre and url:
            leyes.append((nombre, url))
    return leyes


def main() -> None:
    leyes = leer_lista_leyes()
    fecha_hoy = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    catalogo = []

    for idx, (nombre, url) in enumerate(leyes):
        ley_slug = slugify(nombre)
        carpeta_ley = LEYES_DIR / ley_slug
        carpeta_ley.mkdir(parents=True, exist_ok=True)

        print(f"[{idx + 1}/{len(leyes)}] Descargando {nombre}...")
        html = descargar_html(url)
        articulos = extraer_articulos_boe(html)
        print(f"   -> {len(articulos)} artículos detectados.")

        indice_articulos = []
        modificados = 0

        for art in articulos:
            nombre_archivo = f"{art['slug']}.md"
            ruta_md = carpeta_ley / nombre_archivo
            cambio, tiene_hist = guardar_articulo_con_historial(
                ruta_md, art["markdown"], fecha_hoy, art["notaMod"]
            )
            if cambio:
                modificados += 1

            indice_articulos.append({
                "id": art["slug"],
                "titulo": art["titulo"],
                "archivo": f"leyes/{ley_slug}/{nombre_archivo}",
                "historial": tiene_hist,
                "libro": art["libro"],
                "tituloNorma": art["tituloNorma"],
                "capitulo": art["capitulo"],
                "seccion": art["seccion"],
            })

        indice_js_path = carpeta_ley / f"indice-{ley_slug}.js"
        indice_payload = {
            "id": ley_slug,
            "nombre": nombre,
            "urlBoe": url,
            "actualizado": fecha_hoy,
            "articulos": indice_articulos,
        }
        indice_js_path.write_text(
            "// Generado automáticamente desde BOE. No editar a mano.\n"
            f"window.INDICES_LEYES = window.INDICES_LEYES || {{}};\n"
            f"window.INDICES_LEYES[{json.dumps(ley_slug)}] = {json.dumps(indice_payload, ensure_ascii=False, indent=2)};\n",
            encoding="utf-8",
        )

        print(f"   -> {modificados} artículos nuevos/modificados.")

        catalogo.append({
            "id": ley_slug,
            "nombre": nombre,
            "urlBoe": url,
            "indiceScript": f"leyes/{ley_slug}/indice-{ley_slug}.js",
            "totalArticulos": len(indice_articulos),
            "actualizado": fecha_hoy,
        })

        if idx < len(leyes) - 1:
            time.sleep(1.5)

    CONFIG_JS_FILE.write_text(
        "// Catálogo ligero de leyes generado automáticamente. No editar a mano.\n"
        f"window.LEYES_CONFIG = {json.dumps(catalogo, ensure_ascii=False, indent=2)};\n",
        encoding="utf-8",
    )
    print(f"Catálogo actualizado en {CONFIG_JS_FILE} con {len(catalogo)} leyes.")


if __name__ == "__main__":
    main()
