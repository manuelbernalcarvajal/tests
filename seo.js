(function () {
  "use strict";

  const SITE_NAME = "MBC";
  const DEFAULT_DESCRIPTION =
    "Apuntes jurídicos y textos consolidados del BOE con navegación por temas y bloques.";

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

  function buildCanonicalUrl(paramsObj) {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
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

  function obtenerClaveBloque(art) {
    return (
      [art.libro, art.tituloNorma, art.capitulo, art.seccion]
        .filter(Boolean)
        .join(" › ") || ""
    );
  }

  function actualizarApuntes() {
    const params = new URLSearchParams(window.location.search);
    const selAsig = document.getElementById("select-asignatura");
    const selTema = document.getElementById("select-tema");

    const asigId = (selAsig && selAsig.value) || params.get("asig") || "";
    const temaId = (selTema && selTema.value) || params.get("tema") || "";

    if (!asigId || typeof APUNTES_CONFIG === "undefined") {
      document.title = `Apuntes | ${SITE_NAME}`;
      upsertMeta("name", "description", DEFAULT_DESCRIPTION);
      upsertMeta("name", "robots", "index, follow");
      upsertCanonical(buildCanonicalUrl({}));
      return;
    }

    const asig = APUNTES_CONFIG.find((a) => a.id === asigId);
    if (!asig) return;

    if (!temaId) {
      document.title = `${asig.asignatura} — Apuntes | ${SITE_NAME}`;
      upsertMeta(
        "name",
        "description",
        `Apuntes y temario de ${asig.asignatura}.`
      );
      upsertMeta("name", "robots", "index, follow");
      upsertCanonical(buildCanonicalUrl({ asig: asig.id }));
      return;
    }

    const tema = asig.temas.find((t) => t.id === temaId);
    if (!tema) return;

    const tituloLimpio = limpiarTituloTema(tema.titulo);
    const pendiente = esTemaPendiente(tema);

    document.title = `${tituloLimpio} — ${asig.asignatura} | ${SITE_NAME}`;
    upsertMeta(
      "name",
      "description",
      pendiente
        ? `Tema en preparación: ${tituloLimpio} (${asig.asignatura}).`
        : `Apuntes y desarrollo de ${tituloLimpio} en ${asig.asignatura}.`
    );

    // Noindex temporal mientras esté en proceso; vuelve a indexarse solo al completarse
    upsertMeta(
      "name",
      "robots",
      pendiente ? "noindex, follow" : "index, follow"
    );

    upsertCanonical(buildCanonicalUrl({ asig: asig.id, tema: tema.id }));
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

    document.title = `${leyMeta.nombre} — Visor BOE | ${SITE_NAME}`;
    upsertMeta(
      "name",
      "description",
      `Texto consolidado de ${leyMeta.nombre} organizado por bloques y artículos.`
    );
    upsertCanonical(buildCanonicalUrl({ ley: leyMeta.id }));

    if (!artId || !leyMeta.indiceScript) return;

    cargarIndiceSiHaceFalta(leyMeta, (indiceData) => {
      const arts = Array.isArray(indiceData.articulos) ? indiceData.articulos : [];
      const art = arts.find((a) => a.id === artId);
      if (!art) return;

      const bloque = obtenerClaveBloque(art);
      const primerArtDelBloque = bloque
        ? arts.find((a) => obtenerClaveBloque(a) === bloque) || art
        : art;

      document.title = bloque
        ? `${bloque} (${art.titulo}) — ${leyMeta.nombre} | ${SITE_NAME}`
        : `${art.titulo} — ${leyMeta.nombre} | ${SITE_NAME}`;

      upsertMeta(
        "name",
        "description",
        bloque
          ? `${leyMeta.nombre}: ${bloque} (${art.titulo}). Texto consolidado del BOE.`
          : `${leyMeta.nombre}: ${art.titulo}. Texto consolidado del BOE.`
      );

      // Consolida hacia el primer artículo del bloque (vista por bloques)
      upsertCanonical(
        buildCanonicalUrl({
          ley: leyMeta.id,
          art: primerArtDelBloque.id,
        })
      );
    });
  }

  function ejecutar() {
    if (document.getElementById("select-ley")) {
      actualizarLeyes();
    } else if (document.getElementById("select-asignatura")) {
      actualizarApuntes();
    }
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

    window.addEventListener("popstate", ejecutar);
  }

  engancharEventos();
  ejecutar();
})();
