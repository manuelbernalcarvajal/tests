import json
import re
import unicodedata
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
LEYES_DIR = BASE_DIR / "leyes"
APUNTES_DIR = BASE_DIR / "apuntes"
CITAS_JS_FILE = LEYES_DIR / "citas_apuntes.js"

# 1. Diccionario de abreviaturas y denominaciones -> posibles slugs de carpeta en leyes/
ALIAS_LEYES: list[tuple[str, list[str]]] = [
    (r"\b(?:CP|C\.P\.|C[oó]digo\s+Penal)\b", ["codigo-penal"]),
    (
        r"\b(?:LECrim|LECr|L\.E\.Crim\.|Ley\s+de\s+Enjuiciamiento\s+Criminal|Ley\s+de\s+Enjuiciamiento\s+Penal)\b",
        ["ley-de-enjuiciamiento-penal", "ley-de-enjuiciamiento-criminal"],
    ),
    (
        r"\b(?:LEC|L\.E\.C\.|Ley\s+de\s+Enjuiciamiento\s+Civil)\b",
        ["ley-de-enjuiciamiento-civil"],
    ),
    (r"\b(?:CC|C\.c\.|C[oó]digo\s+Civil)\b", ["codigo-civil"]),
    (
        r"\b(?:CE|C\.E\.|Constituci[oó]n(?:\s+Espa[nñ]ola)?)\b",
        ["constitucion-espanola", "constitucion"],
    ),
    (
        r"\b(?:LOPJ|L\.O\.P\.J\.|Ley\s+Org[aá]nica\s+del\s+Poder\s+Judicial)\b",
        ["ley-organica-del-poder-judicial", "lopj"],
    ),
    (
        r"\b(?:LJV|Ley\s+de\s+(?:la\s+)?Jurisdicci[oó]n\s+Voluntaria)\b",
        ["ley-de-la-jurisdiccion-voluntaria", "ley-de-jurisdiccion-voluntaria"],
    ),
    (
        r"\b(?:TRLGDCU|LGDCU|Ley\s+General\s+para\s+la\s+Defensa\s+de\s+los\s+Consumidores)\b",
        ["trlgdcu", "ley-general-para-la-defensa-de-los-consumidores-y-usuarios"],
    ),
]

# 2. Leyes por defecto según carpeta de asignatura cuando se cita "art. X" sin siglas
ASIG_A_LEYES_DEFECTO: dict[str, list[str]] = {
    "penal": ["codigo-penal"],
    "procesalpenal": ["ley-de-enjuiciamiento-penal", "ley-de-enjuiciamiento-criminal"],
    "civil": ["codigo-civil", "ley-de-enjuiciamiento-civil"],
    "procesalcivil1": ["ley-de-enjuiciamiento-civil"],
}

SUFIJOS_LATINOS = r"(?:bis|ter|quater|quinquies|sexies|septies|octies|novies|decies|[a-z])"

# Captura bloques completos tipo:
# "art. 147", "artículo 588 bis a.4", "arts. 10, 11 y 12", "artículos 583 a 588"
PATRON_BLOQUE_CITA = re.compile(
    rf"\b(?:art[íi]culos?|arts?\.?)\s+"
    rf"("
    rf"\d+(?:\s+{SUFIJOS_LATINOS})?(?:[\.,]\d+[ªºa-z]?)?"
    rf"(?:\s*(?:,|y|e|a|al|-|–)\s*\d+(?:\s+{SUFIJOS_LATINOS})?(?:[\.,]\d+[ªºa-z]?)?)*"
    rf")",
    re.IGNORECASE,
)


def slugify(texto: str) -> str:
    texto = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii")
    texto = re.sub(r"[^a-zA-Z0-9]+", "-", texto.lower()).strip("-")
    return texto


def cargar_indices_leyes() -> dict[str, set[str]]:
    """Lee todos los leyes/*/indice-*.js ya generados y extrae los slugs válidos de cada ley."""
    indices: dict[str, set[str]] = {}
    if not LEYES_DIR.exists():
        return indices

    for js_file in sorted(LEYES_DIR.glob("*/indice-*.js")):
        contenido = js_file.read_text(encoding="utf-8", errors="ignore")
        # Extraer el objeto JSON asignado a window.INDICES_LEYES[...] = {...};
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
    """
    Convierte '588 bis a.4' o '24.1' o '147 bis' en 'art-588-bis-a' / 'art-24' / 'art-147-bis'.
    """
    m = re.match(
        rf"^\s*(\d+(?:\s+{SUFIJOS_LATINOS})?)",
        token.strip(),
        re.IGNORECASE,
    )
    if not m:
        return None
    base = slugify(m.group(1))
    return f"art-{base}" if base else None


def expandir_expresion_articulos(expr: str) -> list[str]:
    """
    Descompone listas ('10, 11 y 12') y rangos ('583 a 588' o '147-150') en slugs ['art-10', ...].
    """
    resultados: list[str] = []
    # Separar primero por comas o conjunciones 'y' / 'e'
    partes = re.split(r"\s*(?:,|\by\b|\be\b)\s*", expr.strip(), flags=re.IGNORECASE)

    for parte in partes:
        if not parte:
            continue

        # Comprobar si es un rango numérico puro: "583 a 588", "583 al 588", "583-588"
        m_rango = re.match(r"^(\d+)\s*(?:a|al|-|–)\s*(\d+)$", parte.strip(), re.IGNORECASE)
        if m_rango:
            inicio = int(m_rango.group(1))
            fin = int(m_rango.group(2))
            if inicio <= fin and (fin - inicio) <= 30:
                for n in range(inicio, fin + 1):
                    resultados.append(f"art-{n}")
                continue

        slug = normalizar_token_articulo(parte)
        if slug:
            resultados.append(slug)

    return resultados


def detectar_leyes_en_contexto(
    texto: str, start: int, end: int, carpeta_asig: str, leyes_disponibles: set[str]
) -> list[str]:
    """
    Determina a qué ley o leyes corresponde una cita mirando:
    1) Siglas/nombre justo después de la cita (ventana +45 chars)
    2) Siglas/nombre justo antes de la cita (ventana -45 chars)
    3) Asignatura por defecto de la carpeta
    """
    despues = texto[end : min(len(texto), end + 45)]
    for patron, candidatos in ALIAS_LEYES:
        if re.search(patron, despues):
            validos = [c for c in candidatos if c in leyes_disponibles]
            if validos:
                return validos

    antes = texto[max(0, start - 45) : start]
    for patron, candidatos in ALIAS_LEYES:
        if re.search(patron, antes):
            validos = [c for c in candidatos if c in leyes_disponibles]
            if validos:
                return validos

    por_defecto = ASIG_A_LEYES_DEFECTO.get(carpeta_asig, [])
    return [c for c in por_defecto if c in leyes_disponibles]


def main() -> None:
    indices_leyes = cargar_indices_leyes()
    leyes_disponibles = set(indices_leyes.keys())

    if not indices_leyes:
        print("No hay índices de leyes en leyes/*/indice-*.js todavía.")
        return

    citas: dict[str, set[str]] = {}
    total_menciones = 0
    sin_match_articulo = 0

    for md_file in sorted(APUNTES_DIR.rglob("*.md")):
        clave_apunte = md_file.relative_to(APUNTES_DIR).as_posix()
        if clave_apunte == "enproceso.md":
            continue

        carpeta_asig = clave_apunte.split("/", 1)[0]
        texto = md_file.read_text(encoding="utf-8", errors="ignore")

        for m in PATRON_BLOQUE_CITA.finditer(texto):
            expr = m.group(1)
            art_slugs = expandir_expresion_articulos(expr)
            if not art_slugs:
                continue

            leyes_destino = detectar_leyes_en_contexto(
                texto, m.start(), m.end(), carpeta_asig, leyes_disponibles
            )
            if not leyes_destino:
                continue

            for art_slug in art_slugs:
                total_menciones += 1
                encontrado = False
                for ley_slug in leyes_destino:
                    if art_slug in indices_leyes[ley_slug]:
                        citas.setdefault(f"{ley_slug}/{art_slug}", set()).add(clave_apunte)
                        encontrado = True
                if not encontrado:
                    sin_match_articulo += 1

    resultado_final = {k: sorted(v) for k, v in sorted(citas.items())}

    CITAS_JS_FILE.write_text(
        "// Mapa ligero de citas cruzadas entre leyes y apuntes. Generado por scripts/indexar_citas.py.\n"
        f"window.CITAS_APUNTES_BOE = {json.dumps(resultado_final, ensure_ascii=False, indent=2)};\n",
        encoding="utf-8",
    )

    print(f"Indexación completada: {len(resultado_final)} artículos únicos enlazados.")
    print(f"Menciones procesadas: {total_menciones} (sin artículo en índice: {sin_match_articulo}).")


if __name__ == "__main__":
    main()
