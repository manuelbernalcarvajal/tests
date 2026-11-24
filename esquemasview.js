/**
 * esquemasview.js — Visor de esquemas rápidos integrado en apuntes.html
 * Requiere: apuntes_config.js y esquemas_config.js cargados previamente.
 */
(function () {
  "use strict";

  const PARAM_ESQUEMA = "esquema";
  const STATE_ATTR = "data-mbc-esquema-active";

  let isEsquemaActive = false;
  let btnToggleEsquema = null;
  let originalFetch = null;
  let bypassNextIntercept = false;

  /* ==========================================================================
     1. HELPERS DE CONFIGURACIÓN Y URL
     ========================================================================== */
  function getEsquemaEntry(asigId, temaId) {
    if (typeof ESQUEMAS_CONFIG === "undefined" || !Array.isArray(ESQUEMAS_CONFIG)) {
      return null;
    }
    const asig = ESQUEMAS_CONFIG.find((a) => a.id === asigId);
    if (!asig || !Array.isArray(asig.temas)) return null;

    const tema = asig.temas.find((t) => t.id === temaId);
    if (!tema || !tema.archivo) return null;

    return {
      asignatura: asig.asignatura,
      asigId: asig.id,
      temaId: tema.id,
      titulo: tema.titulo,
      archivo: tema.archivo
    };
  }

  function setEsquemaUrlParam(enabled) {
    const url = new URL(window.location.href);
    if (enabled) {
      url.searchParams.set(PARAM_ESQUEMA, "1");
    } else {
      url.searchParams.delete(PARAM_ESQUEMA);
    }
    window.history.replaceState({}, "", url.toString());
  }

  function hasEsquemaParamInUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get(PARAM_ESQUEMA) === "1";
  }

  /* ==========================================================================
     2. ESTILOS DE ESTUDIO, MODO OSCURO, MÓVIL E IMPRESIÓN
     ========================================================================== */
  function injectEsquemaStyles() {
    if (document.getElementById("mbc-esquemas-css")) return;

    const style = document.createElement("style");
    style.id = "mbc-esquemas-css";
    style.textContent = `
      /* Botón en cabecera */
      #mbc-btn-esquema {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #eff6ff;
        color: #1d4ed8;
        border-color: #bfdbfe;
        font-weight: 600;
        white-space: nowrap;
        transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
      }
      #mbc-btn-esquema:hover:not(:disabled) {
        background: #dbeafe;
        border-color: #93c5fd;
      }
      #mbc-btn-esquema.is-active {
        background: #1d4ed8;
        color: #ffffff;
        border-color: #1d4ed8;
      }
      #mbc-btn-esquema:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      html[data-mbc-theme="dark"] #mbc-btn-esquema {
        background-color: #172554 !important;
        color: #93c5fd !important;
        border-color: #1e40af !important;
      }
      html[data-mbc-theme="dark"] #mbc-btn-esquema:hover:not(:disabled) {
        background-color: #1e3a8a !important;
      }
      html[data-mbc-theme="dark"] #mbc-btn-esquema.is-active {
        background-color: #2563eb !important;
        color: #ffffff !important;
        border-color: #3b82f6 !important;
      }

      /* Cabecera del modo esquema */
      .mbc-esquema-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 12px 16px;
        margin-bottom: 24px;
        border-radius: 8px;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        color: #1e3a8a;
        font-size: 13.5px;
      }
      .mbc-esquema-banner-info {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
      }
      .mbc-esquema-tag {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #1d4ed8;
      }
      .mbc-esquema-sub {
        color: #334155;
        font-size: 12.5px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .mbc-esquema-close-btn {
        flex-shrink: 0;
        padding: 7px 13px;
        border-radius: 6px;
        border: 1px solid #93c5fd;
        background: #ffffff;
        color: #1d4ed8;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.15s ease;
      }
      .mbc-esquema-close-btn:hover {
        background: #dbeafe;
      }

      html[data-mbc-theme="dark"] .mbc-esquema-banner {
        background-color: #172554 !important;
        border-color: #1e40af !important;
        color: #e2e8f0 !important;
      }
      html[data-mbc-theme="dark"] .mbc-esquema-tag {
        color: #93c5fd !important;
      }
      html[data-mbc-theme="dark"] .mbc-esquema-sub {
        color: #cbd5e1 !important;
      }
      html[data-mbc-theme="dark"] .mbc-esquema-close-btn {
        background-color: #0f172a !important;
        color: #93c5fd !important;
        border-color: #3b82f6 !important;
      }
      html[data-mbc-theme="dark"] .mbc-esquema-close-btn:hover {
        background-color: #1e3a8a !important;
      }

      /* Estética de estudio cómoda y escaneable SOLO cuando el esquema está activo */
      .markdown-body[data-mbc-esquema-active="true"] h1 {
        margin-top: 0.2em;
        padding-bottom: 10px;
        border-bottom: 2px solid var(--accent, #0d6efd);
      }
      .markdown-body[data-mbc-esquema-active="true"] h2 {
        margin-top: 1.6em;
        margin-bottom: 0.75em;
        padding: 7px 12px;
        border-left: 4px solid var(--accent, #0d6efd);
        background: rgba(13, 110, 253, 0.06);
        border-radius: 0 6px 6px 0;
      }
      .markdown-body[data-mbc-esquema-active="true"] h3 {
        margin-top: 1.25em;
        margin-bottom: 0.5em;
        color: #1e3a8a;
      }
      .markdown-body[data-mbc-esquema-active="true"] ul,
      .markdown-body[data-mbc-esquema-active="true"] ol {
        margin-left: 20px;
        margin-bottom: 1.1em;
      }
      .markdown-body[data-mbc-esquema-active="true"] li {
        margin-bottom: 0.55em;
        line-height: 1.55;
      }
      .markdown-body[data-mbc-esquema-active="true"] blockquote {
        background: #f8fafc;
        border-left: 4px solid #0d6efd;
        border-radius: 0 6px 6px 0;
        padding: 10px 14px;
        margin: 1.1em 0;
        color: #334155;
      }
      .markdown-body[data-mbc-esquema-active="true"] pre {
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 14px 16px;
        margin: 1.2em 0;
      }
      .markdown-body[data-mbc-esquema-active="true"] table {
        border-radius: 6px;
        overflow: hidden;
        margin: 1.3em 0;
      }
      .markdown-body[data-mbc-esquema-active="true"] th {
        background: #eff6ff;
        color: #1e3a8a;
      }
      .markdown-body[data-mbc-esquema-active="true"] tr:nth-child(even) td {
        background: rgba(15, 23, 42, 0.02);
      }

      /* Modo oscuro aplicado al esquema */
      html[data-mbc-theme="dark"] .markdown-body[data-mbc-esquema-active="true"] h3 {
        color: #93c5fd !important;
      }
      html[data-mbc-theme="dark"] .markdown-body[data-mbc-esquema-active="true"] h2 {
        background: rgba(96, 165, 250, 0.12) !important;
        border-left-color: #60a5fa !important;
      }
      html[data-mbc-theme="dark"] .markdown-body[data-mbc-esquema-active="true"] blockquote {
        background: #0f172a !important;
        border-left-color: #60a5fa !important;
        color: #cbd5e1 !important;
      }
      html[data-mbc-theme="dark"] .markdown-body[data-mbc-esquema-active="true"] pre {
        background: #0f172a !important;
        border-color: #334155 !important;
      }
      html[data-mbc-theme="dark"] .markdown-body[data-mbc-esquema-active="true"] th {
        background: #172554 !important;
        color: #dbeafe !important;
      }
      html[data-mbc-theme="dark"] .markdown-body[data-mbc-esquema-active="true"] tr:nth-child(even) td {
        background: rgba(255, 255, 255, 0.02) !important;
      }

      /* Adaptación móvil */
      @media (max-width: 768px) {
        .mbc-esquema-banner {
          flex-direction: column;
          align-items: stretch;
          gap: 10px;
          padding: 12px;
          margin-bottom: 16px;
        }
        .mbc-esquema-sub {
          white-space: normal;
        }
        .mbc-esquema-close-btn {
          width: 100%;
          text-align: center;
          padding: 10px 12px;
        }
        .markdown-body[data-mbc-esquema-active="true"] h2 {
          padding: 6px 10px;
          font-size: 1.15em !important;
        }
        .markdown-body[data-mbc-esquema-active="true"] li {
          margin-bottom: 0.65em;
        }
      }

      /* Impresión: el banner aparece SOLO si el esquema está activo; el botón cerrar nunca se imprime */
      .mbc-esquema-banner {
        display: none;
      }
      .markdown-body[data-mbc-esquema-active="true"] .mbc-esquema-banner {
        display: flex;
      }
      @media (max-width: 768px) {
        .markdown-body[data-mbc-esquema-active="true"] .mbc-esquema-banner {
          display: flex;
          flex-direction: column;
        }
      }
      @media print {
        .mbc-esquema-banner {
          display: none !important;
        }
        .markdown-body[data-mbc-esquema-active="true"] .mbc-esquema-banner {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          background: #ffffff !important;
          border: 1px solid #999999 !important;
          color: #111111 !important;
          padding: 8px 12px !important;
          margin-bottom: 14px !important;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .markdown-body[data-mbc-esquema-active="true"] .mbc-esquema-tag,
        .markdown-body[data-mbc-esquema-active="true"] .mbc-esquema-sub {
          color: #111111 !important;
        }
        .mbc-esquema-close-btn {
          display: none !important;
        }
        .markdown-body[data-mbc-esquema-active="true"] h2 {
          background: transparent !important;
          border-left: 3px solid #333333 !important;
          padding: 2px 0 2px 8px !important;
        }
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  /* ==========================================================================
     3. ACTUALIZACIÓN DE ÍNDICE Y BOTONES
     ========================================================================== */
  function refreshToc() {
    const docContent = document.getElementById("doc-content");
    const tocList = document.getElementById("toc-list");
    if (!docContent || !tocList) return;

    tocList.innerHTML = "";
    const headings = docContent.querySelectorAll("h1, h2, h3");

    if (!headings.length) {
      tocList.innerHTML = '<li style="color:#888; font-size:13px;">Sin encabezados disponibles.</li>';
      return;
    }

    headings.forEach((heading, idx) => {
      const id = "sec-" + idx;
      heading.id = id;

      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "#" + id;
      a.textContent = heading.textContent;

      if (heading.tagName === "H2") a.classList.add("toc-h2");
      if (heading.tagName === "H3") a.classList.add("toc-h3");

      li.appendChild(a);
      tocList.appendChild(li);
    });
  }

  function updateToggleButtonState() {
    if (!btnToggleEsquema) return;

    const selAsig = document.getElementById("select-asignatura");
    const selTema = document.getElementById("select-tema");
    const entry = selAsig && selTema ? getEsquemaEntry(selAsig.value, selTema.value) : null;

    if (!entry) {
      btnToggleEsquema.disabled = true;
      btnToggleEsquema.classList.remove("is-active");
      btnToggleEsquema.title = "No hay esquema disponible para este tema";
      btnToggleEsquema.innerHTML = "🗂️ Esquema";
      return;
    }

    btnToggleEsquema.disabled = false;
    if (isEsquemaActive) {
      btnToggleEsquema.classList.add("is-active");
      btnToggleEsquema.title = "Volver a los apuntes completos";
      btnToggleEsquema.innerHTML = "📖 Apuntes";
    } else {
      btnToggleEsquema.classList.remove("is-active");
      btnToggleEsquema.title = "Abrir esquema de repaso rápido";
      btnToggleEsquema.innerHTML = "🗂️ Esquema";
    }
  }

  function resetEsquemaState(cleanUrl = true) {
    isEsquemaActive = false;
    const article = document.querySelector("article.markdown-body");
    if (article) {
      article.removeAttribute(STATE_ATTR);
    }
    if (cleanUrl) {
      setEsquemaUrlParam(false);
    }
    updateToggleButtonState();
  }

  /* ==========================================================================
     4. CARGA Y CIERRE DEL ESQUEMA
     ========================================================================== */
  async function openEsquema() {
    const selAsig = document.getElementById("select-asignatura");
    const selTema = document.getElementById("select-tema");
    const docContent = document.getElementById("doc-content");
    const printTitle = document.getElementById("print-title");
    const printUrl = document.getElementById("print-url");
    const mainScroll = document.getElementById("main-scroll");

    if (!selAsig || !selTema || !docContent) return;

    const entry = getEsquemaEntry(selAsig.value, selTema.value);
    if (!entry) return;

    if (window.ttsReader && typeof window.ttsReader.stop === "function") {
      window.ttsReader.stop();
    }

    isEsquemaActive = true;
    setEsquemaUrlParam(true);
    updateToggleButtonState();

    const article = document.querySelector("article.markdown-body");
    if (article) {
      article.setAttribute(STATE_ATTR, "true");
    }

    if (printTitle) {
      printTitle.textContent = `${entry.asignatura} — Esquema: ${entry.titulo}`;
    }
    if (printUrl) {
      printUrl.textContent = window.location.href;
    }

    docContent.innerHTML = "<p>Cargando esquema...</p>";

    try {
      const fetchFn = originalFetch || window.fetch.bind(window);
      const res = await fetchFn(entry.archivo);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const mdText = await res.text();
      const htmlBody = typeof marked !== "undefined" ? marked.parse(mdText) : `<pre>${mdText}</pre>`;

      const bannerHtml = `
        <div class="mbc-esquema-banner" role="region" aria-label="Modo esquema">
          <div class="mbc-esquema-banner-info">
            <span class="mbc-esquema-tag">Esquema de repaso rápido</span>
            <span class="mbc-esquema-sub">${entry.asignatura} · ${entry.titulo}</span>
          </div>
          <button type="button" class="mbc-esquema-close-btn" id="mbc-close-esquema-btn">
            ↩ Volver a los apuntes
          </button>
        </div>
      `;

      docContent.innerHTML = bannerHtml + htmlBody;

      const closeBtn = document.getElementById("mbc-close-esquema-btn");
      if (closeBtn) {
        closeBtn.addEventListener("click", closeEsquema);
      }

      refreshToc();

      if (mainScroll) {
        mainScroll.scrollTo({ top: 0, behavior: "smooth" });
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      docContent.innerHTML = `
        <div class="mbc-esquema-banner">
          <div class="mbc-esquema-banner-info">
            <span class="mbc-esquema-tag">Aviso</span>
            <span class="mbc-esquema-sub">No se pudo cargar el esquema (${entry.archivo}).</span>
          </div>
          <button type="button" class="mbc-esquema-close-btn" id="mbc-close-esquema-btn">
            ↩ Volver a los apuntes
          </button>
        </div>
        <p style="color:#dc2626;">Error al cargar el esquema: ${err.message}</p>
      `;
      const closeBtn = document.getElementById("mbc-close-esquema-btn");
      if (closeBtn) {
        closeBtn.addEventListener("click", closeEsquema);
      }
    }
  }

  function closeEsquema() {
    if (!isEsquemaActive) return;
    resetEsquemaState(true);

    const selTema = document.getElementById("select-tema");
    if (selTema && selTema.value) {
      selTema.dispatchEvent(new Event("change"));
    }
  }

  /* ==========================================================================
     5. INTERCEPCIÓN LIMPIA PARA CARGA DIRECTA DESDE URL (?esquema=1)
     ========================================================================== */
  function installDirectUrlSupport() {
    if (!hasEsquemaParamInUrl()) return;

    originalFetch = window.fetch.bind(window);
    const selAsig = document.getElementById("select-asignatura");
    const selTema = document.getElementById("select-tema");

    window.fetch = function (input, init) {
      const urlStr = typeof input === "string" ? input : (input && input.url) || "";
      const asigVal = selAsig ? selAsig.value : "";
      const temaVal = selTema ? selTema.value : "";
      const entry = getEsquemaEntry(asigVal, temaVal);

      if (
        !bypassNextIntercept &&
        hasEsquemaParamInUrl() &&
        entry &&
        urlStr.includes(".md") &&
        !urlStr.includes(entry.archivo)
      ) {
        bypassNextIntercept = true;
        setTimeout(() => {
          openEsquema().finally(() => {
            bypassNextIntercept = false;
          });
        }, 0);
        return Promise.resolve(new Response("", { status: 200 }));
      }

      return originalFetch(input, init);
    };
  }

  /* ==========================================================================
     6. MONTAJE Y EVENTOS
     ========================================================================== */
  function mountButton() {
    const headerActions = document.querySelector("header .header-actions");
    if (!headerActions || document.getElementById("mbc-btn-esquema")) return;

    btnToggleEsquema = document.createElement("button");
    btnToggleEsquema.id = "mbc-btn-esquema";
    btnToggleEsquema.type = "button";
    btnToggleEsquema.disabled = true;
    btnToggleEsquema.textContent = "🗂️ Esquema";

    btnToggleEsquema.addEventListener("click", () => {
      if (isEsquemaActive) {
        closeEsquema();
      } else {
        openEsquema();
      }
    });

    headerActions.insertBefore(btnToggleEsquema, headerActions.firstChild);
  }

  function bindSelectors() {
    const selAsig = document.getElementById("select-asignatura");
    const selTema = document.getElementById("select-tema");

    if (selAsig) {
      selAsig.addEventListener("change", () => {
        resetEsquemaState(true);
      });
    }

    if (selTema) {
      selTema.addEventListener("change", () => {
        if (!bypassNextIntercept) {
          resetEsquemaState(true);
        }
        updateToggleButtonState();
      });
    }
  }

  function init() {
    injectEsquemaStyles();
    mountButton();
    bindSelectors();
    installDirectUrlSupport();
    updateToggleButtonState();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
