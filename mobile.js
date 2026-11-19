/**
 * mobile.js — Capa de adaptación móvil integral para Portal Jurídico MBC
 * Respeta el CSS del visor estándar en justificación (móvil e impresión) y aísla @media print.
 */
(function () {
  const MOBILE_BP = 768;

  function isMobile() {
    return window.innerWidth <= MOBILE_BP;
  }

  /* ==========================================================================
     1. INYECCIÓN DE ESTILOS RESPONSIVE (<= 768px) + AISLAMIENTO DE IMPRESIÓN
     ========================================================================== */
  function injectStyles() {
    if (document.getElementById("mbc-mobile-css")) return;

    const style = document.createElement("style");
    style.id = "mbc-mobile-css";
    style.textContent = `
      /* Botones auxiliares ocultos por defecto */
      .mbc-mobile-only { display: none; }

      @media (max-width: ${MOBILE_BP}px) {
        .mbc-mobile-only { display: inline-flex; }

        /* Prevenir zoom automático de iOS/Android al enfocar campos */
        input, select, textarea {
          font-size: 16px !important;
        }

        /* Liberar footer fijo para ganar área de lectura real */
        footer {
          position: static !important;
          margin-top: 28px !important;
          padding: 14px 12px !important;
          font-size: 11.5px !important;
        }
        body {
          padding-bottom: 16px !important;
          overflow-x: hidden !important;
        }

        /* Botón flotante Volver Arriba */
        #mbc-scroll-top {
          position: fixed;
          bottom: 18px;
          right: 16px;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #1e3a8a;
          color: #fff;
          border: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          font-size: 18px;
          font-weight: bold;
          align-items: center;
          justify-content: center;
          z-index: 950;
          cursor: pointer;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        #mbc-scroll-top.visible {
          display: inline-flex;
          opacity: 1;
          pointer-events: auto;
        }
        body.mbc-tts-open #mbc-scroll-top {
          bottom: 76px !important;
        }

        /* ====================================================================
           INDEX.HTML
           ==================================================================== */
        body.mbc-index {
          padding: 16px 12px !important;
        }
        body.mbc-index .hero-card {
          padding: 22px 16px !important;
          margin-bottom: 16px !important;
        }
        body.mbc-index .hero-card h1 { font-size: 23px !important; }
        body.mbc-index .hero-card p { font-size: 14px !important; margin-bottom: 16px !important; }
        body.mbc-index .grid-tools {
          grid-template-columns: 1fr !important;
          gap: 12px !important;
        }
        body.mbc-index .tool-card {
          padding: 16px !important;
        }

        /* ====================================================================
           TEST.HTML (Simulador de Examen)
           ==================================================================== */
        body.mbc-test {
          flex-direction: column !important;
          align-items: stretch !important;
          padding: 12px 10px 80px 10px !important;
        }
        body.mbc-test > a[href="index.html"] {
          width: 100% !important;
          text-align: center !important;
          margin-bottom: 12px !important;
          padding: 11px !important;
          border-radius: 8px !important;
        }
        body.mbc-test .card {
          padding: 18px 14px !important;
          border-radius: 10px !important;
        }
        body.mbc-test .btn-group {
          flex-direction: column !important;
          gap: 10px !important;
        }
        body.mbc-test .btn-group .btn {
          width: 100% !important;
          padding: 14px 16px !important;
          font-size: 1rem !important;
        }
        body.mbc-test #question-text {
          font-size: 1.05rem !important;
          line-height: 1.45 !important;
        }
        body.mbc-test .option-btn {
          padding: 14px 13px !important;
          font-size: 0.96rem !important;
          line-height: 1.42 !important;
          margin-bottom: 10px !important;
          min-height: 48px !important;
        }
        body.mbc-test .nav-bar {
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          background: #ffffff !important;
          border-top: 1px solid #cbd5e1 !important;
          padding: 10px 12px !important;
          margin: 0 !important;
          z-index: 900 !important;
          box-shadow: 0 -4px 12px rgba(0,0,0,0.06) !important;
        }
        body.mbc-test .nav-bar .btn {
          flex: 1 !important;
          padding: 13px 10px !important;
          font-size: 0.95rem !important;
        }
        body.mbc-test > p > a[href*="count.html"] {
          display: inline-block;
          margin-top: 12px;
          padding: 6px 14px;
          opacity: 0.5;
        }

        /* ====================================================================
           APUNTES.HTML (Visor con Drawer Lateral + Justificación estándar)
           ==================================================================== */
        body.mbc-apuntes {
          height: auto !important;
          min-height: 100vh !important;
          overflow-y: auto !important;
        }
        body.mbc-apuntes header {
          flex-wrap: wrap !important;
          padding: 10px 12px !important;
          gap: 8px !important;
        }
        body.mbc-apuntes header > a {
          flex: 1 !important;
          text-align: center !important;
          padding: 9px 6px !important;
          font-size: 13px !important;
        }
        body.mbc-apuntes .header-actions {
          margin-left: 0 !important;
        }
        body.mbc-apuntes #btn-tts-toggle,
        body.mbc-apuntes #btn-print {
          padding: 8px 11px !important;
          min-height: 38px !important;
        }
        body.mbc-apuntes #select-asignatura,
        body.mbc-apuntes #select-tema {
          width: 100% !important;
          max-width: 100% !important;
          flex: 1 1 100% !important;
          padding: 9px 10px !important;
        }
        body.mbc-apuntes .layout {
          display: block !important;
          overflow: visible !important;
        }

        /* Drawer lateral para el índice en móvil */
        body.mbc-apuntes aside#toc-container {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          bottom: 0 !important;
          width: 82vw !important;
          max-width: 320px !important;
          max-height: 100vh !important;
          z-index: 1200 !important;
          background: #ffffff !important;
          border-right: 1px solid #cbd5e1 !important;
          box-shadow: 4px 0 24px rgba(0,0,0,0.25) !important;
          padding: 18px 16px 40px 16px !important;
          transform: translateX(-105%);
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          overflow-y: auto !important;
        }
        body.mbc-apuntes aside#toc-container.mbc-drawer-open {
          transform: translateX(0) !important;
        }
        #mbc-drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          z-index: 1150;
          display: none;
        }
        #mbc-drawer-backdrop.visible {
          display: block !important;
        }
        #mbc-fab-toc {
          display: inline-flex;
          position: fixed;
          bottom: 18px;
          left: 16px;
          background: #0f172a;
          color: #ffffff;
          border: none;
          border-radius: 24px;
          padding: 10px 16px;
          font-size: 13.5px;
          font-weight: 600;
          box-shadow: 0 4px 14px rgba(0,0,0,0.28);
          z-index: 950;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        body.mbc-tts-open #mbc-fab-toc {
          bottom: 76px !important;
        }
        #mbc-drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 10px;
          margin-bottom: 12px;
        }
        #mbc-drawer-close {
          background: #f1f5f9;
          border: none;
          border-radius: 6px;
          padding: 5px 10px;
          font-size: 14px;
          cursor: pointer;
        }

        /* Área de lectura optimizada con justificación del modo estándar */
        body.mbc-apuntes main {
          overflow: visible !important;
          padding: 10px 8px 60px 8px !important;
        }
        body.mbc-apuntes .markdown-body {
          padding: 18px 14px !important;
          font-size: 15.5px !important;
          line-height: 1.65 !important;
          border-radius: 8px !important;
        }
        body.mbc-apuntes .markdown-body h1,
        body.mbc-apuntes .markdown-body h2,
        body.mbc-apuntes .markdown-body h3 {
          text-align: left !important;
        }
        body.mbc-apuntes .markdown-body h1 { font-size: 1.45em !important; }
        body.mbc-apuntes .markdown-body h2 { font-size: 1.22em !important; }
        body.mbc-apuntes .markdown-body h3 { font-size: 1.08em !important; }
        body.mbc-apuntes .markdown-body p,
        body.mbc-apuntes .markdown-body li {
          text-align: justify !important;
          text-justify: inter-word !important;
          hyphens: auto !important;
          -webkit-hyphens: auto !important;
        }
        body.mbc-apuntes .markdown-body ul,
        body.mbc-apuntes .markdown-body ol {
          margin-left: 18px !important;
        }
        body.mbc-apuntes .markdown-body table {
          display: block !important;
          width: 100% !important;
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch;
        }
        body.mbc-apuntes .markdown-body pre {
          padding: 10px !important;
          font-size: 12px !important;
        }

        /* Barra de navegación entre temas al final del documento */
        #mbc-theme-nav {
          display: flex;
          gap: 10px;
          margin-top: 28px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
        }
        #mbc-theme-nav button {
          flex: 1;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #1e293b;
          padding: 12px 10px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        #mbc-theme-nav button:disabled {
          opacity: 0.4;
          cursor: default;
        }

        /* Dock TTS compacto en móvil */
        body.mbc-apuntes #tts-dock {
          bottom: 10px !important;
          left: 10px !important;
          right: 10px !important;
          padding: 8px 10px !important;
          gap: 5px !important;
          justify-content: space-between !important;
        }
        body.mbc-apuntes #tts-dock button {
          padding: 8px 10px !important;
          min-height: 36px !important;
        }

        /* ====================================================================
           SEARCH.HTML (Buscador)
           ==================================================================== */
        body.mbc-search {
          padding: 12px 10px !important;
        }
        body.mbc-search .top-nav {
          justify-content: space-between;
          margin-bottom: 14px !important;
        }
        body.mbc-search .top-nav a {
          flex: 1;
          text-align: center;
          background: #fff;
          padding: 9px 8px;
          border-radius: 6px;
          border: 1px solid #dee2e6;
        }
        body.mbc-search .search-card {
          padding: 16px 14px !important;
        }
        body.mbc-search .search-card h1 { font-size: 19px !important; }
        body.mbc-search #search-input {
          padding-right: 38px !important;
        }
        #mbc-clear-search {
          display: inline-flex;
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: #e2e8f0;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          font-size: 12px;
          color: #475569;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        #mbc-quick-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }
        .mbc-chip {
          background: #e7f1ff;
          color: #0d6efd;
          border: 1px solid #bfdbfe;
          border-radius: 16px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        body.mbc-search .result-card {
          padding: 16px 14px !important;
        }
        body.mbc-search .result-snippet {
          text-align: justify !important;
          text-justify: inter-word !important;
          hyphens: auto !important;
          -webkit-hyphens: auto !important;
          padding: 12px !important;
          font-size: 14px !important;
        }
        body.mbc-search .result-actions {
          flex-direction: column !important;
          gap: 8px !important;
          align-items: stretch !important;
        }
        body.mbc-search .btn-action,
        body.mbc-search .link-viewer {
          justify-content: center !important;
          text-align: center !important;
          padding: 10px !important;
          background: #f1f5f9 !important;
          border-radius: 6px !important;
        }

        /* ====================================================================
           LIBRO.HTML (Maquetador A4 Paged.js)
           ==================================================================== */
        body.mbc-libro #control-bar {
          padding: 10px 12px !important;
          gap: 8px !important;
        }
        body.mbc-libro #control-bar a,
        body.mbc-libro #control-bar select,
        body.mbc-libro #control-bar button {
          width: 100% !important;
          min-width: 0 !important;
          margin-left: 0 !important;
          text-align: center !important;
          padding: 10px !important;
        }
        body.mbc-libro #setup-panel {
          margin: 14px 10px !important;
          padding: 18px 14px !important;
        }
        body.mbc-libro .tema-item {
          padding: 10px 6px !important;
        }
        body.mbc-libro .tema-item input[type="checkbox"] {
          width: 20px !important;
          height: 20px !important;
        }
        body.mbc-libro .pagedjs_pages {
          padding: 14px 0 32px 0 !important;
          gap: 14px !important;
          overflow-x: hidden !important;
        }

        /* ====================================================================
           COUNT.HTML (Estadísticas)
           ==================================================================== */
        body.mbc-count {
          padding: 12px 10px !important;
        }
        body.mbc-count .card {
          padding: 18px 14px !important;
        }
        body.mbc-count .stats-grid {
          grid-template-columns: 1fr !important;
          gap: 10px !important;
        }
      }

      /* Reglas de impresión independientes y limpias */
      @media print {
        .mbc-mobile-only,
        #mbc-fab-toc,
        #mbc-scroll-top,
        #mbc-theme-nav,
        #mbc-drawer-backdrop,
        #mbc-quick-filters,
        #mbc-clear-search {
          display: none !important;
          visibility: hidden !important;
        }

        body,
        body.mbc-apuntes,
        body.mbc-search,
        body.mbc-test,
        body.mbc-libro,
        body.mbc-count,
        body.mbc-index {
          height: auto !important;
          min-height: 0 !important;
          overflow: visible !important;
          padding: 0 !important;
          margin: 0 !important;
        }

        .markdown-body p,
        .markdown-body li {
          text-align: justify !important;
          text-justify: inter-word !important;
          hyphens: auto !important;
          -webkit-hyphens: auto !important;
          orphans: 3;
          widows: 3;
        }

        h1, h2, h3 {
          page-break-after: avoid;
          break-after: avoid;
        }

        pre, table, blockquote, .katex-display {
          page-break-inside: avoid;
          break-inside: avoid;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /* ==========================================================================
     2. BOTÓN FLOTANTE "VOLVER ARRIBA" GLOBAL
     ========================================================================== */
  function setupScrollTopButton() {
    if (document.getElementById("mbc-scroll-top")) return;

    const btn = document.createElement("button");
    btn.id = "mbc-scroll-top";
    btn.className = "mbc-mobile-only";
    btn.type = "button";
    btn.title = "Volver arriba";
    btn.textContent = "↑";
    document.body.appendChild(btn);

    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    window.addEventListener("scroll", () => {
      if (!isMobile()) return;
      if (window.scrollY > 350) {
        btn.classList.add("visible");
      } else {
        btn.classList.remove("visible");
      }
    }, { passive: true });
  }

  /* ==========================================================================
     3. MEJORAS ESPECÍFICAS POR VISTA
     ========================================================================== */

  // --- APUNTES.HTML: Drawer lateral del índice + Botones Tema Anterior/Siguiente ---
  function enhanceApuntes() {
    document.body.classList.add("mbc-apuntes");

    const aside = document.getElementById("toc-container");
    const dock = document.getElementById("tts-dock");

    if (dock) {
      const dockObserver = new MutationObserver(() => {
        const isOpen = getComputedStyle(dock).display !== "none";
        document.body.classList.toggle("mbc-tts-open", isOpen);
      });
      dockObserver.observe(dock, { attributes: true, attributeFilter: ["style"] });
    }

    if (aside && !document.getElementById("mbc-fab-toc")) {
      const backdrop = document.createElement("div");
      backdrop.id = "mbc-drawer-backdrop";
      document.body.appendChild(backdrop);

      const fab = document.createElement("button");
      fab.id = "mbc-fab-toc";
      fab.className = "mbc-mobile-only";
      fab.type = "button";
      fab.innerHTML = "📑 Índice";
      document.body.appendChild(fab);

      const oldH3 = aside.querySelector("h3");
      const drawerHeader = document.createElement("div");
      drawerHeader.id = "mbc-drawer-header";
      drawerHeader.className = "mbc-mobile-only";
      drawerHeader.innerHTML = `
        <strong style="font-size:14px; color:#0f172a;">📑 Índice del Tema</strong>
        <button type="button" id="mbc-drawer-close">✕</button>
      `;
      if (oldH3) {
        aside.insertBefore(drawerHeader, oldH3);
      }

      const openDrawer = () => {
        aside.classList.add("mbc-drawer-open");
        backdrop.classList.add("visible");
      };
      const closeDrawer = () => {
        aside.classList.remove("mbc-drawer-open");
        backdrop.classList.remove("visible");
      };

      fab.addEventListener("click", openDrawer);
      backdrop.addEventListener("click", closeDrawer);
      drawerHeader.querySelector("#mbc-drawer-close").addEventListener("click", closeDrawer);

      aside.addEventListener("click", (e) => {
        if (isMobile() && e.target.tagName === "A") {
          closeDrawer();
        }
      });
    }

    const docContent = document.getElementById("doc-content");
    const selTema = document.getElementById("select-tema");
    if (docContent && selTema) {
      const renderThemeNav = () => {
        if (docContent.querySelector("#mbc-theme-nav")) return;
        const idx = selTema.selectedIndex;
        if (idx <= 0) return;

        const nav = document.createElement("div");
        nav.id = "mbc-theme-nav";
        nav.className = "mbc-mobile-only";

        const btnPrev = document.createElement("button");
        btnPrev.type = "button";
        btnPrev.textContent = "◀ Tema anterior";
        btnPrev.disabled = idx <= 1;
        btnPrev.onclick = () => {
          selTema.selectedIndex = idx - 1;
          selTema.dispatchEvent(new Event("change"));
          window.scrollTo({ top: 0, behavior: "smooth" });
        };

        const btnNext = document.createElement("button");
        btnNext.type = "button";
        btnNext.textContent = "Tema siguiente ▶";
        btnNext.disabled = idx >= selTema.options.length - 1;
        btnNext.onclick = () => {
          selTema.selectedIndex = idx + 1;
          selTema.dispatchEvent(new Event("change"));
          window.scrollTo({ top: 0, behavior: "smooth" });
        };

        nav.appendChild(btnPrev);
        nav.appendChild(btnNext);
        docContent.appendChild(nav);
      };

      const contentObserver = new MutationObserver(renderThemeNav);
      contentObserver.observe(docContent, { childList: true });
    }
  }

  // --- TEST.HTML: Gestos Swipe + Scroll automático al cambiar pregunta ---
  function enhanceTest() {
    document.body.classList.add("mbc-test");

    const viewTest = document.getElementById("view-test");
    const btnPrev = document.getElementById("btn-prev");
    const btnNext = document.getElementById("btn-next");
    const qText = document.getElementById("question-text");

    if (qText) {
      const qObserver = new MutationObserver(() => {
        if (isMobile() && viewTest && !viewTest.classList.contains("hide")) {
          viewTest.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
      qObserver.observe(qText, { childList: true, characterData: true, subtree: true });
    }

    if (viewTest && btnPrev && btnNext) {
      let touchStartX = 0;
      let touchStartY = 0;

      viewTest.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
      }, { passive: true });

      viewTest.addEventListener("touchend", (e) => {
        if (!isMobile()) return;
        const deltaX = e.changedTouches[0].screenX - touchStartX;
        const deltaY = e.changedTouches[0].screenY - touchStartY;

        if (Math.abs(deltaX) > 65 && Math.abs(deltaX) > Math.abs(deltaY) * 1.6) {
          if (deltaX < 0 && !btnNext.disabled) {
            btnNext.click();
          } else if (deltaX > 0 && !btnPrev.disabled) {
            btnPrev.click();
          }
        }
      }, { passive: true });
    }
  }

  // --- SEARCH.HTML: Chips de filtros rápidos + Botón limpiar búsqueda ---
  function enhanceSearch() {
    document.body.classList.add("mbc-search");

    const input = document.getElementById("search-input");
    const wrapper = document.querySelector(".search-input-wrapper");
    const tips = document.querySelector(".search-tips");

    if (input && wrapper && !document.getElementById("mbc-clear-search")) {
      const clearBtn = document.createElement("button");
      clearBtn.id = "mbc-clear-search";
      clearBtn.className = "mbc-mobile-only";
      clearBtn.type = "button";
      clearBtn.textContent = "✕";
      clearBtn.style.display = "none";
      wrapper.appendChild(clearBtn);

      const toggleClear = () => {
        clearBtn.style.setProperty("display", input.value.length > 0 ? "inline-flex" : "none", "important");
      };

      input.addEventListener("input", toggleClear);
      clearBtn.addEventListener("click", () => {
        input.value = "";
        toggleClear();
        input.dispatchEvent(new Event("input"));
        input.focus();
      });
    }

    if (input && tips && !document.getElementById("mbc-quick-filters")) {
      const chipsBar = document.createElement("div");
      chipsBar.id = "mbc-quick-filters";
      chipsBar.className = "mbc-mobile-only";

      const filtros = [
        { label: "Civil", token: "asig:civil " },
        { label: "Procesal Civil", token: "asig:procesalcivil1 " },
        { label: "Procesal Penal", token: "asig:procesalpenal " },
        { label: "Penal", token: "asig:penal " },
        { label: '"Exacta"', token: '""' }
      ];

      filtros.forEach((f) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "mbc-chip";
        chip.textContent = f.label;
        chip.addEventListener("click", () => {
          if (f.token === '""') {
            input.value = (input.value ? input.value.trim() + " " : "") + '""';
            input.focus();
            input.setSelectionRange(input.value.length - 1, input.value.length - 1);
          } else {
            const cleaned = input.value.replace(/\basig:[a-z0-9_-]+\s*/gi, "").trim();
            input.value = f.token + (cleaned ? cleaned + " " : "");
            input.focus();
            input.dispatchEvent(new Event("input"));
          }
        });
        chipsBar.appendChild(chip);
      });

      tips.parentNode.insertBefore(chipsBar, tips.nextSibling);
    }
  }

  // --- LIBRO.HTML: Escalado proporcional de hojas A4 ---
  function enhanceLibro() {
    document.body.classList.add("mbc-libro");

    const preview = document.getElementById("book-preview");
    if (!preview) return;

    const scalePages = () => {
      const pages = preview.querySelectorAll(".pagedjs_page");
      if (!pages.length) return;

      if (!isMobile()) {
        pages.forEach((p) => {
          p.style.transform = "";
          p.style.marginBottom = "";
        });
        return;
      }

      const targetWidth = window.innerWidth - 16;
      pages.forEach((page) => {
        const w = page.offsetWidth || 794;
        const h = page.offsetHeight || 1123;
        if (w > targetWidth) {
          const ratio = targetWidth / w;
          page.style.transformOrigin = "top center";
          page.style.transform = `scale(${ratio})`;
          page.style.marginBottom = `-${h * (1 - ratio)}px`;
        }
      });
    };

    const obs = new MutationObserver(scalePages);
    obs.observe(preview, { childList: true, subtree: true });
    window.addEventListener("resize", scalePages);
  }

  /* ==========================================================================
     4. ARRANQUE AUTOMÁTICO SEGÚN LA PÁGINA ACTUAL
     ========================================================================== */
  function init() {
    injectStyles();
    setupScrollTopButton();

    const path = window.location.pathname.toLowerCase();

    if (document.getElementById("doc-content") || path.includes("apuntes.html")) {
      enhanceApuntes();
    } else if (document.getElementById("view-menu") || path.includes("test.html")) {
      enhanceTest();
    } else if (document.getElementById("search-input") || path.includes("search.html")) {
      enhanceSearch();
    } else if (document.getElementById("book-preview") || path.includes("libro.html")) {
      enhanceLibro();
    } else if (document.getElementById("details-table") || path.includes("count.html")) {
      document.body.classList.add("mbc-count");
    } else {
      document.body.classList.add("mbc-index");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
