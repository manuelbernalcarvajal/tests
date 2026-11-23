(function () {
  "use strict";

  let btnLeyes = null;
  let popover = null;

  function obtenerClaveTemaActual() {
    const selAsig = document.getElementById("select-asignatura");
    const selTema = document.getElementById("select-tema");
    if (!selAsig || !selTema || typeof APUNTES_CONFIG === "undefined") return null;

    const asig = APUNTES_CONFIG.find((a) => a.id === selAsig.value);
    const tema = asig ? asig.temas.find((t) => t.id === selTema.value) : null;
    if (!tema || !tema.archivo) return null;

    return tema.archivo.replace(/^\.?\/?apuntes\//i, "");
  }

  function nombreLegibleLey(leySlug) {
    if (Array.isArray(window.LEYES_CONFIG)) {
      const encontrada = window.LEYES_CONFIG.find((l) => l.id === leySlug);
      if (encontrada && encontrada.nombre) return encontrada.nombre;
    }
    return leySlug
      .split("-")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
  }

  function formatearArticuloSlug(artSlug) {
    // Convierte "art-588-bis-a" en "Art. 588 bis a"
    return artSlug
      .replace(/^art-/, "Art. ")
      .replace(/-/g, " ")
      .trim();
  }

  function buscarCitasDelTema(claveTema) {
    if (!claveTema || !window.CITAS_APUNTES_BOE) return [];

    const matches = [];
    for (const [claveCompleta, apuntesList] of Object.entries(window.CITAS_APUNTES_BOE)) {
      if (!Array.isArray(apuntesList) || !apuntesList.includes(claveTema)) continue;
      const sepIdx = claveCompleta.indexOf("/");
      if (sepIdx <= 0) continue;

      const leySlug = claveCompleta.slice(0, sepIdx);
      const artSlug = claveCompleta.slice(sepIdx + 1);

      matches.push({
        leySlug,
        leyNombre: nombreLegibleLey(leySlug),
        artSlug,
        artLabel: formatearArticuloSlug(artSlug),
        url: `leyes.html?ley=${encodeURIComponent(leySlug)}&art=${encodeURIComponent(artSlug)}`,
      });
    }

    // Ordenar por ley y número de artículo
    matches.sort((a, b) => {
      if (a.leyNombre !== b.leyNombre) return a.leyNombre.localeCompare(b.leyNombre, "es");
      const numA = parseInt((a.artSlug.match(/\d+/) || ["0"])[0], 10);
      const numB = parseInt((b.artSlug.match(/\d+/) || ["0"])[0], 10);
      if (numA !== numB) return numA - numB;
      return a.artSlug.localeCompare(b.artSlug);
    });

    return matches;
  }

  function inyectarEstilos() {
    if (document.getElementById("mbc-citas-apuntes-css")) return;
    const style = document.createElement("style");
    style.id = "mbc-citas-apuntes-css";
    style.textContent = `
      #btn-leyes-citadas {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: var(--surface, #fff);
        white-space: nowrap;
        font-size: 13px;
      }
      #btn-leyes-citadas:hover {
        background: rgba(13, 110, 253, 0.08);
        border-color: var(--accent, #0d6efd);
      }
      #btn-leyes-citadas .mbc-citas-count {
        background: var(--accent, #0d6efd);
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        padding: 1px 6px;
        border-radius: 999px;
        line-height: 1.3;
      }

      #mbc-citas-popover {
        position: fixed;
        top: 54px;
        right: 20px;
        width: min(360px, calc(100vw - 24px));
        max-height: 65vh;
        overflow-y: auto;
        background: var(--surface, #fff);
        color: var(--text, #212529);
        border: 1px solid var(--border, #dee2e6);
        border-radius: 8px;
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
        padding: 12px 14px;
        z-index: 250;
        display: none;
        font-size: 13px;
      }
      #mbc-citas-popover.open {
        display: block;
      }
      .mbc-citas-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding-bottom: 8px;
        margin-bottom: 8px;
        border-bottom: 1px solid var(--border, #dee2e6);
        font-weight: 600;
        font-size: 12.5px;
      }
      .mbc-citas-close {
        background: transparent;
        border: none;
        color: inherit;
        cursor: pointer;
        font-size: 14px;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .mbc-citas-close:hover {
        background: rgba(128, 128, 128, 0.15);
      }
      .mbc-citas-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .mbc-citas-list a {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 6px 8px;
        border-radius: 5px;
        text-decoration: none;
        color: inherit;
        transition: background 0.15s ease;
      }
      .mbc-citas-list a:hover {
        background: rgba(13, 110, 253, 0.12);
        color: var(--accent, #0d6efd);
      }
      .mbc-citas-ley {
        font-size: 11.5px;
        opacity: 0.75;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .mbc-citas-empty {
        opacity: 0.75;
        font-size: 12.5px;
        padding: 4px 0;
      }

      @media (max-width: 768px) {
        #btn-leyes-citadas .mbc-citas-label {
          display: none;
        }
        #mbc-citas-popover {
          top: auto;
          bottom: 44px;
          left: 12px;
          right: 12px;
          width: auto;
          max-height: 55vh;
        }
      }

      @media print {
        #btn-leyes-citadas, #mbc-citas-popover {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function actualizarBoton() {
    if (!btnLeyes || !popover) return;
    const claveTema = obtenerClaveTemaActual();
    const citas = buscarCitasDelTema(claveTema);

    const badge = btnLeyes.querySelector(".mbc-citas-count");
    if (badge) {
      badge.textContent = String(citas.length);
      badge.style.display = citas.length > 0 ? "inline-block" : "none";
    }

    const bodyEl = popover.querySelector(".mbc-citas-body");
    if (!bodyEl) return;

    if (!claveTema) {
      bodyEl.innerHTML = `<div class="mbc-citas-empty">Abre un tema para ver los artículos del BOE enlazados.</div>`;
      return;
    }

    if (citas.length === 0) {
      bodyEl.innerHTML = `<div class="mbc-citas-empty">No hay artículos enlazados para este tema en el índice actual.</div>`;
      return;
    }

    const itemsHtml = citas
      .map(
        (c) => `
        <li>
          <a href="${c.url}" title="${c.artLabel} — ${c.leyNombre}">
            <strong>${c.artLabel}</strong>
            <span class="mbc-citas-ley">${c.leyNombre}</span>
          </a>
        </li>
      `
      )
      .join("");

    bodyEl.innerHTML = `<ul class="mbc-citas-list">${itemsHtml}</ul>`;
  }

  function init() {
    const headerActions = document.querySelector(".header-actions");
    const ttsBtn = document.getElementById("btn-tts-toggle");
    if (!headerActions) return;

    inyectarEstilos();

    btnLeyes = document.createElement("button");
    btnLeyes.type = "button";
    btnLeyes.id = "btn-leyes-citadas";
    btnLeyes.title = "Ver artículos del BOE citados en este tema";
    btnLeyes.innerHTML = `<span>📜</span><span class="mbc-citas-label">Leyes</span><span class="mbc-citas-count" style="display:none;">0</span>`;

    if (ttsBtn && ttsBtn.parentNode === headerActions) {
      headerActions.insertBefore(btnLeyes, ttsBtn);
    } else {
      headerActions.prepend(btnLeyes);
    }

    popover = document.createElement("div");
    popover.id = "mbc-citas-popover";
    popover.setAttribute("role", "dialog");
    popover.setAttribute("aria-label", "Artículos del BOE citados");
    popover.innerHTML = `
      <div class="mbc-citas-head">
        <span>📜 Artículos enlazados (BOE)</span>
        <button type="button" class="mbc-citas-close" title="Cerrar">✖</button>
      </div>
      <div class="mbc-citas-body"></div>
    `;
    document.body.appendChild(popover);

    btnLeyes.addEventListener("click", (e) => {
      e.stopPropagation();
      actualizarBoton();
      popover.classList.toggle("open");
    });

    popover.querySelector(".mbc-citas-close").addEventListener("click", () => {
      popover.classList.remove("open");
    });

    document.addEventListener("click", (e) => {
      if (
        popover.classList.contains("open") &&
        !popover.contains(e.target) &&
        !btnLeyes.contains(e.target)
      ) {
        popover.classList.remove("open");
      }
    });

    const selTema = document.getElementById("select-tema");
    const selAsig = document.getElementById("select-asignatura");
    if (selTema) {
      selTema.addEventListener("change", () => {
        popover.classList.remove("open");
        actualizarBoton();
      });
    }
    if (selAsig) {
      selAsig.addEventListener("change", () => {
        popover.classList.remove("open");
        actualizarBoton();
      });
    }

    actualizarBoton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
