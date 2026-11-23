import json
import re
import unicodedata
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
LEYES_DIR = BASE_DIR / "leyes"
APUNTES_DIR = BASE_DIR / "apuntes"
ABREVIATURAS_FILE = LEYES_DIR / "abreviaturas_leyes.json"
CITAS_JS_FILE = LEYES_DIR / "citas_apuntes.js"

SUFIJOS_LATINOS = r"(?:bis|ter|quater|quinquies|sexies|septies|octies|novies|decies|[a-z])"
TOKEN_ART = rf"\d+(?:\s+{SUFIJOS_LATINOS})?(?:[\.,]\d+[ªºa-z]?)?"

# Cubre:
# - "art. 147", "Arts. 3 y 4", "artículo 588 bis a.4"
# - "art del 10 al 15", "arts. de 10 a 15", "artículos 10-15"
# - "art 10 y ss", "art. 10 y ss.", "arts. 10 y siguientes"
PATRON_BLOQUE_CITA = re.compile(
    rf"(?<![A-Za-zÁÉÍÓÚÑáéíóúñ])"
    rf"(?:art[íi]culos?|arts?\.?)\s+"
    rf"(?:del?\s+)?"
    rf"("
    rf"{TOKEN_ART}"
    rf"(?:\s*(?:,|y|e|a|al|del?|-\s*|–\s*)\s*{TOKEN_ART})*"
    rf")"
    rf"(?:\s*,?\s*(?:y\s+(?:ss\.?|siguientes?|sgtes\.?)|ss\.?))?",
    re.IGNORECASE,
)


def slugify(texto: str) -> str:
    texto = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii")
    texto = re.sub(r"[^a-zA-Z0-9]+", "-", texto.lower()).strip("-")
    return texto


def normalizar_sin_tildes(texto: str) -> str:
    return unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii").lower()


def construir_patrones_alias(alias_map: dict[str, list[str]]) -> list[tuple[re.Pattern, list[str]]]:
    termino_a_slugs: dict[str, list[str]] = {}
    for ley_slug, terminos in alias_map.items():
        for term in terminos:
            t_limpio = term.strip()
            if not t_limpio:
                continue
            termino_a_slugs.setdefault(t_limpio, [])
            if ley_slug not in termino_a_slugs[t_limpio]:
                termino_a_slugs[t_limpio].append(ley_slug)

    patrones: list[tuple[re.Pattern, list[str]]] = []
    for term, slugs in sorted(termino_a_slugs.items(), key=lambda x: len(x[0]), reverse=True):
        partes = re.split(r"\s+", normalizar_sin_tildes(term))
        partes_regex = []
        for p in partes:
            if len(p) <= 6 and p.isalpha():
                partes_regex.append("".join(f"{re.escape(ch)}\\.?" for ch in p))
            else:
                partes_regex.append(re.escape(p))
        regex_str = r"(?<![A-Za-z0-9])" + r"\s+".join(partes_regex) + r"(?![A-Za-z0-9])"
        patrones.append((re.compile(regex_str, re.IGNORECASE), slugs))

    return patrones


def cargar_config_abreviaturas() -> tuple[list[tuple[re.Pattern, list[str]]], dict[str, list[str]]]:
    if not ABREVIATURAS_FILE.exists():
        print(f"[AVISO] No existe {ABREVIATURAS_FILE}; usando solo asignaturas por defecto.")
        return [], {}

    data = json.loads(ABREVIATURAS_FILE.read_text(encoding="utf-8"))
    alias_raw = data.get("alias_leyes") or {}
    asig_def = data.get("asignaturas_defecto") or {}
    return construir_patrones_alias(alias_raw), asig_def


def cargar_indices_leyes() -> dict[str, set[str]]:
    indices: dict[str, set[str]] = {}
    if not LEYES_DIR.exists():
        return indices

    for js_file in sorted(LEYES_DIR.glob("*/indice-*.js")):
        contenido = js_file.read_text(encoding="utf-8", errors="ignore")
        m = re.search(r"window\.INDICES_LEYES\[[^\]]+\]\s*=\s*(\{.*\});\s*$", contenido, re.DOTALL)
        if not m:
            continue
        try:
            data = json.loads(m.group(1))
            ley_id = data.get("id") or js_file.parent.name
            articulos = data.get("articulos") or []
            indices[ley_id] = {a["id"] for a in articulos if "id" in a}
        except json.JSONDecodeError:
            print(f"[AVISO] No se pudo parsear JSON en {js_file}")

    return indices


def normalizar_token_articulo(token: str) -> str | None:
    m = re.match(rf"^\s*({TOKEN_ART})", token.strip(), re.IGNORECASE)
    if not m:
        return None
    # Quitar apartados decimales tipo ".1" o ",2" para quedarnos con el slug del artículo base
    raiz = re.sub(r"[\.,]\d+[ªºa-z]?$", "", m.group(1).strip(), flags=re.IGNORECASE)
    base = slugify(raiz)
    return f"art-{base}" if base else None


def expandir_expresion_articulos(expr: str, llevar_solo_al_primero: bool = True) -> tuple[list[str], str]:
    """
    Devuelve (lista_slugs, tipo_cita).
    Si es rango ("10 al 15" o "10 a 15") y llevar_solo_al_primero=True, enlaza al primero
    (y si se prefiere expandir, puede activar llevar_solo_al_primero=False).
    """
    resultados: list[str] = []
    tipo = "directa"

    # Detectar rangos tipo "10 al 15", "10 a 15", "10-15"
    m_rango_completo = re.match(r"^(\d+)\s*(?:a|al|-|–)\s*(\d+)$", expr.strip(), re.IGNORECASE)
    if m_rango_completo:
        tipo = "rango_al_primero"
        inicio = int(m_rango_completo.group(1))
        fin = int(m_rango_completo.group(2))
        if llevar_solo_al_primero:
            return [f"art-{inicio}"], tipo
        if inicio <= fin and (fin - inicio) <= 30:
            return [f"art-{n}" for n in range(inicio, fin + 1)], "rango_expandido"

    partes = re.split(r"\s*(?:,|\by\b|\be\b)\s*", expr.strip(), flags=re.IGNORECASE)
    for parte in partes:
        parte_limpia = parte.strip()
        if not parte_limpia or parte_limpia.lower() in {"del", "de", "al", "a"}:
            continue

        m_rango_sub = re.match(r"^(\d+)\s*(?:a|al|-|–)\s*(\d+)$", parte_limpia, re.IGNORECASE)
        if m_rango_sub:
            tipo = "rango_al_primero"
            inicio = int(m_rango_sub.group(1))
            resultados.append(f"art-{inicio}")
            continue

        slug = normalizar_token_articulo(parte_limpia)
        if slug:
            resultados.append(slug)

    # Deduplicar conservando orden
    unicos = list(dict.fromkeys(resultados))
    return unicos, tipo


def detectar_leyes_en_contexto(
    texto_norm: str,
    start: int,
    end: int,
    carpeta_asig: str,
    patrones_alias: list[tuple[re.Pattern, list[str]]],
    asig_defecto: dict[str, list[str]],
    leyes_disponibles: set[str],
) -> tuple[list[str], bool]:
    """
    Devuelve (leyes_candidatas, es_por_defecto_o_en_medios).
    """
    despues = texto_norm[end : min(len(texto_norm), end + 55)]
    for patron, candidatos in patrones_alias:
        if patron.search(despues):
            validos = [c for c in candidatos if c in leyes_disponibles]
            if validos:
                return validos, False

    antes = texto_norm[max(0, start - 55) : start]
    for patron, candidatos in patrones_alias:
        if patron.search(antes):
            validos = [c for c in candidatos if c in leyes_disponibles]
            if validos:
                return validos, False

    por_defecto = asig_defecto.get(carpeta_asig, [])
    validos_def = [c for c in por_defecto if c in leyes_disponibles]
    return validos_def, True


def main() -> None:
    indices_leyes = cargar_indices_leyes()
    leyes_disponibles = set(indices_leyes.keys())
    if not indices_leyes:
        print("No hay índices de leyes en leyes/*/indice-*.js todavía.")
        return

    patrones_alias, asig_defecto = cargar_config_abreviaturas()
    citas: dict[str, set[str]] = {}
    stats = {
        "total": 0,
        "enlazadas": 0,
        "rango_o_ss": 0,
        "en_medios_o_defecto": 0,
        "sin_match": 0,
    }

    for md_file in sorted(APUNTES_DIR.rglob("*.md")):
        clave_apunte = md_file.relative_to(APUNTES_DIR).as_posix()
        if clave_apunte == "enproceso.md":
            continue

        carpeta_asig = clave_apunte.split("/", 1)[0]
        texto = md_file.read_text(encoding="utf-8", errors="ignore")
        texto_norm = normalizar_sin_tildes(texto)

        for m in PATRON_BLOQUE_CITA.finditer(texto):
            expr = m.group(1)
            es_y_ss = bool(re.search(r"\by\s+(?:ss\.?|siguientes?|sgtes\.?)\b", m.group(0), re.IGNORECASE))
            art_slugs, tipo_cita = expandir_expresion_articulos(expr, llevar_solo_al_primero=True)
            if not art_slugs:
                continue

            leyes_destino, es_defecto = detectar_leyes_en_contexto(
                texto_norm,
                m.start(),
                m.end(),
                carpeta_asig,
                patrones_alias,
                asig_defecto,
                leyes_disponibles,
            )
            if not leyes_destino:
                stats["en_medios_o_defecto"] += 1
                continue

            for art_slug in art_slugs:
                stats["total"] += 1
                if es_defecto:
                    stats["en_medios_o_defecto"] += 1
                if es_y_ss or tipo_cita == "rango_al_primero":
                    stats["rango_o_ss"] += 1

                encontrado = False
                for ley_slug in leyes_destino:
                    if art_slug in indices_leyes[ley_slug]:
                        citas.setdefault(f"{ley_slug}/{art_slug}", set()).add(clave_apunte)
                        encontrado = True
                if encontrado:
                    stats["enlazadas"] += 1
                else:
                    stats["sin_match"] += 1

    resultado_final = {k: sorted(v) for k, v in sorted(citas.items())}

    CITAS_JS_FILE.write_text(
        "// Mapa ligero de citas cruzadas entre leyes y apuntes. Generado por scripts/indexar_citas.py.\n"
        f"window.CITAS_APUNTES_BOE = {json.dumps(resultado_final, ensure_ascii=False, indent=2)};\n",
        encoding="utf-8",
    )

    print(f"Indexación completada: {len(resultado_final)} artículos únicos enlazados.")
    print(f"Menciones procesadas: {stats['total']} | Enlazadas: {stats['enlazadas']} | Sin match en ley: {stats['sin_match']}")
    print(f"Rangos / 'y ss.' (al 1.º): {stats['rango_o_ss']} | Por defecto/contexto ('en medios'): {stats['en_medios_o_defecto']}")


if __name__ == "__main__":
    main()
