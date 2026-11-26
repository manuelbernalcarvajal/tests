(function () {
  "use strict";

  const SITE_NAME = "Portal Jurídico MBC";
  const CANONICAL_ORIGIN = "https://testmaster.bcloud.es.eu.org";
  const DEFAULT_DESCRIPTION =
    "Apuntes jurídicos y textos consolidados del BOE organizados por temas y capítulos.";

  function upsertMeta(attrName, attrValue, content) {
    let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attrName, attrValue);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }

  function upsertCanonical(href) {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", href);
  }

  function upsertJsonLd(payload) {
    let script = document.getElementById("mbc-seo-jsonld");
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = "mbc-seo-jsonld";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(payload);
  }

  function buildCanonicalUrl(paramsObj) {
    const pathname = window.location.pathname || "/index.html";
    const url = new URL(pathname, CANONICAL_ORIGIN);
    for (const [key, val] of Object.entries(paramsObj)) {
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        url.searchParams.set(key, String(val).trim());
      }
    }
    return url.toString();
  }

  function limpiarTituloTema(titulo) {
    return (titulo || "")
      .replace(/\/(iniciado|pendiente)\/\s*/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function esTemaPendiente(tema) {
    if (!tema) return false;
    const archivo = (tema.archivo || "").toLowerCase();
    const titulo = (tema.titulo || "").toLowerCase();
    return archivo.includes("enproceso.md") || titulo.includes("/pendiente/");
  }

  function obtenerClaveCapitulo(art) {
    if (!art) return "";
    for (const campo of ["capitulo", "tituloNorma", "libro"]) {
      const val = (art[campo] || "").trim();
      if (val) return `${campo}:${val}`;
    }
    return "";
  }

  function obtenerNombreCapituloLegible(art) {
    if (!art) return "";
    return (art.capitulo || art.tituloNorma || art.libro || "").trim();
  }

  function actualizarApuntes() {
    const params = new URLSearchParams(window.location.search);
    const selAsig = document.getElementById("select-asignatura");
    const selTema = document.getElementById("select-tema");

    const asigId = (selAsig && selAsig.value) || params.get("asig") || "";
    const temaId = (selTema && selTema.value) || params.get("tema") || "";

    if (!asigId || typeof APUNTES_CONFIG === "undefined") {
      const canonical = buildCanonicalUrl({});
      document.title = `Apuntes de Derecho | ${SITE_NAME}`;
      upsertMeta("name", "description", DEFAULT_DESCRIPTION);
      upsertMeta("name", "robots", "index, follow");
      upsertCanonical(canonical);
      return;
    }

    const asig = APUNTES_CONFIG.find((a) => a.id === asigId);
    if (!asig) return;

    if (!temaId) {
      const canonical = buildCanonicalUrl({ asig: asig.id });
      document.title = `${asig.asignatura} — Apuntes | ${SITE_NAME}`;
      upsertMeta(
        "name",
        "description",
        `Apuntes y temario completo de ${asig.asignatura}.`
      );
      upsertMeta("name", "robots", "index, follow");
      upsertCanonical(canonical);
      return;
    }

    const tema = asig.temas.find((t) => t.id === temaId);
    if (!tema) return;

    const tituloLimpio = limpiarTituloTema(tema.titulo);
    const pendiente = esTemaPendiente(tema);
    const canonical = buildCanonicalUrl({ asig: asig.id, tema: tema.id });
    const title = `${tituloLimpio} — ${asig.asignatura} | ${SITE_NAME}`;
    const desc = pendiente
      ? `Tema en preparación: ${tituloLimpio} (${asig.asignatura}).`
      : `Apuntes y desarrollo de ${tituloLimpio} en ${asig.asignatura}.`;

    document.title = title;
    upsertMeta("name", "description", desc);
    upsertMeta(
      "name",
      "robots",
      pendiente ? "noindex, follow" : "index, follow"
    );
    upsertCanonical(canonical);

    if (!pendiente) {
      upsertJsonLd({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: tituloLimpio,
        about: asig.asignatura,
        url: canonical,
        inLanguage: "es",
      });
    }
  }

  function cargarIndiceSiHaceFalta(leyMeta, onReady) {
    window.INDICES_LEYES = window.INDICES_LEYES || {};
    if (window.INDICES_LEYES[leyMeta.id]) {
      onReady(window.INDICES_LEYES[leyMeta.id]);
      return;
    }

    const existing = document.querySelector(
      `script[data-seo-indice="${leyMeta.id}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.INDICES_LEYES[leyMeta.id]) {
          onReady(window.INDICES_LEYES[leyMeta.id]);
        }
      });
      return;
    }

    const s = document.createElement("script");
    s.src = leyMeta.indiceScript;
    s.async = true;
    s.setAttribute("data-seo-indice", leyMeta.id);
    s.onload = () => {
      if (window.INDICES_LEYES[leyMeta.id]) {
        onReady(window.INDICES_LEYES[leyMeta.id]);
      }
    };
    document.body.appendChild(s);
  }

  function actualizarLeyes() {
    const params = new URLSearchParams(window.location.search);
    const selLey = document.getElementById("select-ley");
    const leyId = (selLey && selLey.value) || params.get("ley") || "";
    const artId = params.get("art") || "";

    upsertMeta("name", "robots", "index, follow");

    if (!leyId || !Array.isArray(window.LEYES_CONFIG)) {
      document.title = `Visor de Leyes (BOE) | ${SITE_NAME}`;
      upsertMeta("name", "description", DEFAULT_DESCRIPTION);
      upsertCanonical(buildCanonicalUrl({}));
      return;
    }

    const leyMeta = window.LEYES_CONFIG.find((l) => l.id === leyId);
    if (!leyMeta) return;

    const canonicalLey = buildCanonicalUrl({ ley: leyMeta.id });
    document.title = `${leyMeta.nombre} — Texto Consolidado BOE | ${SITE_NAME}`;
    upsertMeta(
      "name",
      "description",
      `Texto consolidado vigente de ${leyMeta.nombre} organizado por capítulos y artículos.`
    );
    upsertCanonical(canonicalLey);

    if (!artId || !leyMeta.indiceScript) {
      upsertJsonLd({
        "@context": "https://schema.org",
        "@type": "Legislation",
        name: leyMeta.nombre,
        url: canonicalLey,
        inLanguage: "es",
      });
      return;
    }

    cargarIndiceSiHaceFalta(leyMeta, (indiceData) => {
      const arts = Array.isArray(indiceData.articulos) ? indiceData.articulos : [];
      const art = arts.find((a) => a.id === artId);
      if (!art) return;

      const capKey = obtenerClaveCapitulo(art);
      const capNombre = obtenerNombreCapituloLegible(art);
      const primerArtDelCapitulo = capKey
        ? arts.find((a) => obtenerClaveCapitulo(a) === capKey) || art
        : art;

      const canonicalCapitulo = buildCanonicalUrl({
        ley: leyMeta.id,
        art: primerArtDelCapitulo.id,
      });

      const title = capNombre
        ? `${capNombre} — ${leyMeta.nombre} | ${SITE_NAME}`
        : `${art.titulo} — ${leyMeta.nombre} | ${SITE_NAME}`;

      const desc = capNombre
        ? `${leyMeta.nombre}: ${capNombre} (${art.titulo}). Texto consolidado del BOE.`
        : `${leyMeta.nombre}: ${art.titulo}. Texto consolidado del BOE.`;

      document.title = title;
      upsertMeta("name", "description", desc);
      // Consolida hacia el primer artículo del capítulo (coincide 1:1 con sitemap.xml)
      upsertCanonical(canonicalCapitulo);

      upsertJsonLd({
        "@context": "https://schema.org",
        "@type": "Legislation",
        name: capNombre ? `${leyMeta.nombre} — ${capNombre}` : `${leyMeta.nombre} — ${art.titulo}`,
        isPartOf: {
          "@type": "Legislation",
          name: leyMeta.nombre,
          url: canonicalLey,
        },
        url: canonicalCapitulo,
        inLanguage: "es",
      });
    });
  }

  function ejecutar() {
    if (document.getElementById("select-ley")) {
      actualizarLeyes();
    } else if (document.getElementById("select-asignatura")) {
      actualizarApuntes();
    } else {
      upsertCanonical(buildCanonicalUrl({}));
    }
  }

  function envolverHistoryMethod(methodName) {
    const original = window.history[methodName];
    if (typeof original !== "function") return;
    window.history[methodName] = function () {
      const res = original.apply(this, arguments);
      setTimeout(ejecutar, 0);
      return res;
    };
  }

  function engancharEventos() {
    const selAsig = document.getElementById("select-asignatura");
    const selTema = document.getElementById("select-tema");
    const selLey = document.getElementById("select-ley");

    if (selAsig) {
      selAsig.addEventListener("change", () => setTimeout(actualizarApuntes, 0));
    }
    if (selTema) {
      selTema.addEventListener("change", () => setTimeout(actualizarApuntes, 0));
    }
    if (selLey) {
      selLey.addEventListener("change", () => setTimeout(actualizarLeyes, 0));
    }

    envolverHistoryMethod("replaceState");
    envolverHistoryMethod("pushState");
    window.addEventListener("popstate", ejecutar);
  }

  engancharEventos();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ejecutar);
  } else {
    ejecutar();
  }
})();
