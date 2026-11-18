/**
 * darkmode.js — Modo oscuro no intrusivo para Portal Jurídico MBC
 * Respeta prefers-color-scheme, persiste en localStorage y se desactiva al imprimir.
 */
(function () {
  const STORAGE_KEY = "mbc_theme_preference";

  // 1. Aplicar atributo de tema lo antes posible para evitar destellos blancos
  function getInitialTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-mbc-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
    updateToggleButton(theme);
  }

  function updateToggleButton(theme) {
    const btn = document.getElementById("mbc-dark-toggle");
    if (!btn) return;
    btn.textContent = theme === "dark" ? "☀️" : "🌙";
    btn.title = theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
  }

  // 2. Inyectar hoja de estilos oscura (solo en pantalla, nunca en @media print)
  function injectDarkStyles() {
    if (document.getElementById("mbc-dark-css")) return;

    const style = document.createElement("style");
    style.id = "mbc-dark-css";
    style.textContent = `
      @media screen {
        html[data-mbc-theme="dark"] {
          color-scheme: dark;
          --bg: #0f172a !important;
          --surface: #1e293b !important;
          --card: #1e293b !important;
          --text: #e2e8f0 !important;
          --primary: #60a5fa !important;
          --accent: #3b82f6 !important;
          --border: #334155 !important;
          --muted: #94a3b8 !important;
          --neutral: #94a3b8 !important;
          --badge-bg: #1e3a8a !important;
          --badge-text: #93c5fd !important;
          --section-tag: #0f172a !important;
          --success: #4ade80 !important;
          --danger: #f87171 !important;
        }

        html[data-mbc-theme="dark"] body {
          background-color: #0f172a !important;
          color: #e2e8f0 !important;
        }

        /* Tarjetas, contenedores y barras */
        html[data-mbc-theme="dark"] .hero-card,
        html[data-mbc-theme="dark"] .tool-card,
        html[data-mbc-theme="dark"] .search-card,
        html[data-mbc-theme="dark"] .result-card,
        html[data-mbc-theme="dark"] .empty-msg,
        html[data-mbc-theme="dark"] .card,
        html[data-mbc-theme="dark"] .markdown-body,
        html[data-mbc-theme="dark"] aside,
        html[data-mbc-theme="dark"] header,
        html[data-mbc-theme="dark"] footer,
        html[data-mbc-theme="dark"] #setup-panel {
          background-color: #1e293b !important;
          color: #e2e8f0 !important;
          border-color: #334155 !important;
        }

        /* Títulos y textos con color fijo oscuro (#111, #0f172a, #212529) */
        html[data-mbc-theme="dark"] h1,
        html[data-mbc-theme="dark"] h2,
        html[data-mbc-theme="dark"] h3,
        html[data-mbc-theme="dark"] .tool-title,
        html[data-mbc-theme="dark"] .result-title,
        html[data-mbc-theme="dark"] .markdown-body h1,
        html[data-mbc-theme="dark"] .markdown-body h2,
        html[data-mbc-theme="dark"] .markdown-body h3,
        html[data-mbc-theme="dark"] #setup-panel h2 {
          color: #f8fafc !important;
        }

        html[data-mbc-theme="dark"] .tool-card:hover .tool-title,
        html[data-mbc-theme="dark"] .result-title:hover,
        html[data-mbc-theme="dark"] aside a:hover {
          color: #60a5fa !important;
        }

        /* Inputs, selects y botones secundarios */
        html[data-mbc-theme="dark"] input[type="search"],
        html[data-mbc-theme="dark"] input[type="text"],
        html[data-mbc-theme="dark"] select,
        html[data-mbc-theme="dark"] header select,
        html[data-mbc-theme="dark"] header button,
        html[data-mbc-theme="dark"] #btn-tts-toggle,
        html[data-mbc-theme="dark"] #btn-print {
          background-color: #0f172a !important;
          color: #f1f5f9 !important;
          border-color: #475569 !important;
        }

        html[data-mbc-theme="dark"] header button:hover,
        html[data-mbc-theme="dark"] #btn-tts-toggle:hover,
        html[data-mbc-theme="dark"] #btn-print:hover,
        html[data-mbc-theme="dark"] aside a:hover {
          background-color: #334155 !important;
        }

        /* Index.html: separadores y code tags */
        html[data-mbc-theme="dark"] .metrics-row {
          border-top-color: #334155 !important;
        }
        html[data-mbc-theme="dark"] code {
          background-color: #0f172a !important;
          color: #93c5fd !important;
          padding: 1px 4px;
          border-radius: 3px;
        }

        /* Search.html: extractos, resaltados y botones de copia */
        html[data-mbc-theme="dark"] .result-snippet {
          background-color: #0f172a !important;
          color: #cbd5e1 !important;
          border-color: #334155 !important;
        }
        html[data-mbc-theme="dark"] .result-snippet mark {
          background-color: #854d0e !important;
          color: #fef08a !important;
        }
        html[data-mbc-theme="dark"] .result-section-crumb {
          background-color: #0f172a !important;
          color: #94a3b8 !important;
        }
        html[data-mbc-theme="dark"] .btn-action {
          background-color: #0f172a !important;
          color: #cbd5e1 !important;
          border-color: #475569 !important;
        }
        html[data-mbc-theme="dark"] .btn-action:hover {
          background-color: #334155 !important;
          color: #ffffff !important;
        }
        html[data-mbc-theme="dark"] .status-bar {
          border-top-color: #334155 !important;
        }

        /* Apuntes.html: índice, bloques de código, tablas y citas */
        html[data-mbc-theme="dark"] aside a {
          color: #cbd5e1 !important;
        }
        html[data-mbc-theme="dark"] .markdown-body pre {
          background-color: #0f172a !important;
          border-color: #334155 !important;
          color: #e2e8f0 !important;
        }
        html[data-mbc-theme="dark"] .markdown-body th {
          background-color: #0f172a !important;
          color: #f8fafc !important;
        }
        html[data-mbc-theme="dark"] .markdown-body td,
        html[data-mbc-theme="dark"] .markdown-body th {
          border-color: #334155 !important;
        }
        html[data-mbc-theme="dark"] .markdown-body blockquote {
          color: #94a3b8 !important;
          border-left-color: #3b82f6 !important;
        }
        html[data-mbc-theme="dark"] .tts-active-block {
          background-color: rgba(59, 130, 246, 0.22) !important;
        }

        /* Test.html: opciones, resumen y revisión de respuestas */
        html[data-mbc-theme="dark"] .option-btn {
          background-color: #0f172a !important;
          color: #e2e8f0 !important;
          border-color: #334155 !important;
        }
        html[data-mbc-theme="dark"] .option-btn:hover {
          background-color: #1e3a8a !important;
          border-color: #60a5fa !important;
        }
        html[data-mbc-theme="dark"] .option-btn.selected {
          background-color: #172554 !important;
          border-color: #3b82f6 !important;
          color: #ffffff !important;
        }
        html[data-mbc-theme="dark"] #stats-summary {
          background-color: #0f172a !important;
          border-color: #334155 !important;
          color: #e2e8f0 !important;
        }
        html[data-mbc-theme="dark"] .review-item {
          background-color: rgba(185, 28, 28, 0.18) !important;
          color: #e2e8f0 !important;
        }
        html[data-mbc-theme="dark"] .review-item.ok {
          background-color: rgba(21, 128, 61, 0.18) !important;
        }
        html[data-mbc-theme="dark"] .review-item.blank {
          background-color: #0f172a !important;
        }
        html[data-mbc-theme="dark"] .review-item em {
          color: #94a3b8 !important;
        }
        html[data-mbc-theme="dark"] .badge-pass {
          background-color: rgba(21, 128, 61, 0.28) !important;
          color: #86efac !important;
        }
        html[data-mbc-theme="dark"] .badge-fail {
          background-color: rgba(185, 28, 28, 0.28) !important;
          color: #fca5a5 !important;
        }

        /* Count.html: cajas de estadísticas y filas de tabla */
        html[data-mbc-theme="dark"] .stat-box {
          background-color: #0f172a !important;
          border-color: #334155 !important;
        }
        html[data-mbc-theme="dark"] .stat-label {
          color: #94a3b8 !important;
        }
        html[data-mbc-theme="dark"] th,
        html[data-mbc-theme="dark"] .category-row {
          background-color: #0f172a !important;
          color: #93c5fd !important;
        }
        html[data-mbc-theme="dark"] .badge {
          background-color: #1e3a8a !important;
          color: #dbeafe !important;
        }

        /* Libro.html: checklist de selección (las hojas A4 se mantienen en papel blanco) */
        html[data-mbc-theme="dark"] .temas-checklist {
          background-color: #0f172a !important;
          border-color: #334155 !important;
        }
        html[data-mbc-theme="dark"] .tema-item {
          border-bottom-color: #334155 !important;
        }
        html[data-mbc-theme="dark"] .checklist-actions button {
          background-color: #334155 !important;
          color: #f1f5f9 !important;
        }

        /* Compatibilidad con elementos inyectados por mobile.js */
        html[data-mbc-theme="dark"] .nav-bar {
          background-color: #1e293b !important;
          border-top-color: #334155 !important;
        }
        html[data-mbc-theme="dark"] #mbc-theme-nav button,
        html[data-mbc-theme="dark"] .link-viewer {
          background-color: #0f172a !important;
          color: #93c5fd !important;
          border-color: #334155 !important;
        }
        html[data-mbc-theme="dark"] #mbc-drawer-header {
          border-bottom-color: #334155 !important;
        }
        html[data-mbc-theme="dark"] #mbc-drawer-header strong {
          color: #f8fafc !important;
        }
        html[data-mbc-theme="dark"] #mbc-drawer-close {
          background-color: #334155 !important;
          color: #f8fafc !important;
        }
      }

      /* Estilo del botón de cambio de tema */
      #mbc-dark-toggle {
        cursor: pointer;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #1e293b;
        border-radius: 6px;
        padding: 6px 10px;
        font-size: 15px;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s ease;
      }
      html[data-mbc-theme="dark"] #mbc-dark-toggle {
        background: #0f172a !important;
        border-color: #475569 !important;
        color: #f8fafc !important;
      }
      #mbc-dark-toggle.mbc-floating-theme {
        position: fixed;
        top: 12px;
        right: 12px;
        z-index: 1100;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }
      @media print {
        #mbc-dark-toggle { display: none !important; }
      }
    `;
    document.head.appendChild(style);
  }

  // 3. Insertar el botón de alternancia en la cabecera si existe, o flotante en esquina superior derecha
  function mountToggleButton() {
    if (document.getElementById("mbc-dark-toggle")) return;

    const btn = document.createElement("button");
    btn.id = "mbc-dark-toggle";
    btn.type = "button";
    btn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-mbc-theme") || "light";
      applyTheme(current === "dark" ? "light" : "dark");
    });

    // Integración nativa en la barra de acciones de apuntes.html o control-bar de libro.html
    const headerActions = document.querySelector(".header-actions");
    const controlBar = document.getElementById("control-bar");

    if (headerActions) {
      headerActions.insertBefore(btn, headerActions.firstChild);
    } else if (controlBar) {
      controlBar.appendChild(btn);
    } else {
      btn.classList.add("mbc-floating-theme");
      document.body.appendChild(btn);
    }

    updateToggleButton(document.documentElement.getAttribute("data-mbc-theme") || "light");
  }

  // Ejecución inmediata de estilos y tema antes del renderizado completo
  injectStyles();
  const initialTheme = getInitialTheme();
  document.documentElement.setAttribute("data-mbc-theme", initialTheme);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountToggleButton);
  } else {
    mountToggleButton();
  }

  // Escuchar cambios en el tema del sistema operativo si el usuario no forzó uno manual
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        applyTheme(e.matches ? "dark" : "light");
      }
    });
  }
})();
