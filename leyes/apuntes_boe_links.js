(function () {
  "use strict";

  // Mapeo de siglas/denominaciones en el texto -> posibles slugs de ley
  const ALIAS_LEYES = [
    { patron: /\b(?:C\.?P\.?|C[oó]digo\s+Penal)\b/i, slugs: ["codigo-penal"] },
    {
      patron: /\b(?:L\.?E\.?Crim\.?|LECr|Ley\s+de\s+Enjuiciamiento\s+(?:Criminal|Penal))\b/i,
      slugs: ["ley-de-enjuiciamiento-penal", "ley-de-enjuiciamiento-criminal"],
    },
    {
      patron: /\b(?:L\.?E\.?C\.?|Ley\s+de\s+Enjuiciamiento\s+Civil)\b/i,
      slugs: ["ley-de-enjuiciamiento-civil"],
    },
    { patron: /\b(?:C\.?c\.?|C[oó]digo\s+Civil)\b/i, slugs: ["codigo-civil"] },
    {
      patron: /\b(?:C\.?E\.?|Constituci[oó]n(?:\s+Espa[nñ]ola)?)\b/i,
      slugs: ["constitucion-espanola", "constitucion"],
    },
    {
      patron: /\b(?:L\.?O\.?P\.?J\.?|Ley\s+Org[aá]nica\s+del\s+Poder\s+Judicial)\b/i,
      slugs: ["ley-organica-del-poder-judicial", "lopj"],
    },
    {
      patron: /\b(?:LJV|Ley\s+de\s+(?:la\s+)?Jurisdicci[oó]n\s+Voluntaria)\b/i,
      slugs: ["ley-de-la-jurisdiccion-voluntaria", "ley-de-jurisdiccion-voluntaria"],
    },
    {
      patron: /\b(?:TRLGDCU|LGDCU|Ley\s+General\s+para\s+la\s+Defensa\s+de\s+los\s+Consumidores)\b/i,
      slugs: ["trlgdcu", "ley-general-para-la-defensa-de-los-consumidores-y-usuarios"],
    },
  ];

  // Ley por defecto según el select #select-asignatura cuando se cita "art. X" a secas
  const ASIG_DEFECTO = {
    penal: ["codigo-penal"],
    procesalpenal: ["ley-de-enjuiciamiento-penal", "ley-de-enjuiciamiento-criminal"],
    civil: ["codigo-civil", "ley-de-enjuiciamiento-civil"],
    procesalcivil1: ["ley-de-enjuiciamiento-civil"],
  };

  const SUFIJOS = "(?:bis|ter|quater|quinquies|sexies|septies|octies|novies|decies|[a-z])";
  const PATRON_CITA = new RegExp(
    `\\b((?:art[íi]culos?|arts?\\.?)\\s+(\\d+(?:\\s+${SUFIJOS})?)(?:[\\.,]\\d+[ªºa-z]?)?)`,
    "gi"
  );

  function slugifyArt(numRaw) {
    const limpio = numRaw
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-");
    return `art-${limpio}`;
  }

  function obtenerMapaLeyesDisponibles() {
    const mapa = new Map();
    if (!Array.isArray(window.LEYES_CONFIG)) return mapa;
    for (const ley of window.LEYES_CONFIG) {
      if (ley && ley.id) mapa.set(ley.id, ley.nombre || ley.id);
    }
    return mapa;
  }

  function resolverLeyParaContexto(textoCompleto, start, end, asigId, mapaLeyes) {
    // 1. Mirar 45 caracteres después de la cita (ej. "art. 147 CP")
    const despues = textoCompleto.slice(end, Math.min(textoCompleto.length, end + 45));
    for (const item of ALIAS_LEYES) {
      if (item.patron.test(despues)) {
        const encontrado = item.slugs.find((s) => mapaLeyes.has(s));
        if (encontrado) return encontrado;
      }
    }

    // 2. Mirar 45 caracteres antes de la cita (ej. "en el Código Penal, art. 147")
    const antes = textoCompleto.slice(Math.max(0, start - 45), start);
    for (const item of ALIAS_LEYES) {
      if (item.patron.test(antes)) {
        const encontrado = item.slugs.find((s) => mapaLeyes.has(s));
        if (encontrado) return encontrado;
      }
    }

    // 3. Fallback a la ley principal de la asignatura seleccionada
    const candidatosAsig = ASIG_DEFECTO[asigId] || [];
    return candidatosAsig.find((s) => mapaLeyes.has(s)) || null;
  }

  function inyectarEstilosDiscretos() {
    if (document.getElementById("mbc-boe-inline-css")) return;
    const style = document.createElement("style");
    style.id = "mbc-boe-inline-css";
    style.textContent = `
      #doc-content a.mbc-art-link {
        color: inherit;
        text-decoration: underline;
        text-decoration-style: dotted;
        text-decoration-color: var(--accent, #0d6efd);
        text-underline-offset: 3px;
        transition: color 0.15s ease, background-color 0.15s ease;
        border-radius: 3px;
        padding: 0 1px;
      }
      #doc-content a.mbc-art-link:hover {
        color: var(--accent, #0d6efd);
        background-color: rgba(13, 110, 253, 0.08);
        text-decoration-style: solid;
      }
      @media print {
        #doc-content a.mbc-art-link {
          text-decoration: none !important;
          color: inherit !important;
          background: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function procesarContenedor(container, asigId, mapaLeyes) {
    if (!container || mapaLeyes.size === 0) return;

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !/art/i.test(node.nodeValue)) {
          return NodeFilter.FILTER_REJECT;
        }
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (
          parent.closest(
            "a, code, pre, script, style, h1, h2, h3, .katex, .print-header"
          )
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const nodosTexto = [];
    let actual;
    while ((actual = walker.nextNode())) {
      nodosTexto.push(actual);
    }

    for (const nodo of nodosTexto) {
      const texto = nodo.nodeValue;
      PATRON_CITA.lastIndex = 0;

      let match;
      let ultimoIdx = 0;
      let huboCambios = false;
      const frag = document.createDocumentFragment();

      while ((match = PATRON_CITA.exec(texto)) !== null) {
        const textoCita = match[1];
        const numRaw = match[2];
        const start = match.index;
        const end = start + textoCita.length;

        const leySlug = resolverLeyParaContexto(texto, start, end, asigId, mapaLeyes);
        if (!leySlug) continue;

        const artSlug = slugifyArt(numRaw);
        const nombreLey = mapaLeyes.get(leySlug) || leySlug;

        if (start > ultimoIdx) {
          frag.appendChild(document.createTextNode(texto.slice(ultimoIdx, start)));
        }

        const a = document.createElement("a");
        a.className = "mbc-art-link";
        a.href = `leyes.html?ley=${encodeURIComponent(leySlug)}&art=${encodeURIComponent(artSlug)}`;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.title = `Abrir en ${nombreLey} (nueva pestaña)`;
        a.textContent = textoCita;

        frag.appendChild(a);
        ultimoIdx = end;
        huboCambios = true;
      }

      if (huboCambios) {
        if (ultimoIdx < texto.length) {
          frag.appendChild(document.createTextNode(texto.slice(ultimoIdx)));
        }
        nodo.parentNode.replaceChild(frag, nodo);
      }
    }
  }

  function init() {
    const docContent = document.getElementById("doc-content");
    const selAsig = document.getElementById("select-asignatura");
    if (!docContent || !selAsig) return;

    const mapaLeyes = obtenerMapaLeyesDisponibles();
    if (mapaLeyes.size === 0) return;

    inyectarEstilosDiscretos();

    let procesando = false;
    const observer = new MutationObserver(() => {
      if (procesando) return;
      const asigId = selAsig.value;
      if (!asigId) return;

      procesando = true;
      observer.disconnect();
      try {
        procesarContenedor(docContent, asigId, mapaLeyes);
      } finally {
        procesando = false;
        observer.observe(docContent, { childList: true });
      }
    });

    observer.observe(docContent, { childList: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
