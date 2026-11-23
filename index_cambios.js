(function () {
  "use strict";

  const MAX_ITEMS = 5; // Solo los 5 últimos cambios para que quede compacto

  function tiempoRelativo(isoString) {
    const fecha = new Date(isoString);
    if (Number.isNaN(fecha.getTime())) return "";

    const diffMin = Math.floor((Date.now() - fecha.getTime()) / 60000);
    if (diffMin < 1) return "hace un momento";
    if (diffMin < 60) return `hace ${diffMin} min`;

    const diffHoras = Math.floor(diffMin / 60);
    if (diffHoras < 24) {
      return diffHoras === 1 ? "hace 1 hora" : `hace ${diffHoras} horas`;
    }

    const diffDias = Math.floor(diffHoras / 24);
    if (diffDias < 7) {
      return diffDias === 1 ? "hace 1 día" : `hace ${diffDias} días`;
    }

    return fecha.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  }

  function resolverTema(claveArchivo) {
    const ruta = `apuntes/${claveArchivo}`;
    if (typeof APUNTES_CONFIG !== "undefined") {
      for (const asig of APUNTES_CONFIG) {
        const tema = asig.temas.find((t) => t.archivo === ruta);
        if (tema) {
          // Extraer etiqueta corta tipo "Tema 1" o "T07.1" del título
          const match = tema.titulo.match(/^T0*(\d+(?:\.\d+)?)/i);
          const etiquetaTema = match
            ? `Tema ${match[1]}`
            : tema.titulo.split(":")[0];
          const asigCorta = asig.asignatura.replace(/^Derecho\s+/i, "");

          return {
            texto: `${etiquetaTema} · ${asigCorta}`,
            tituloCompleto: tema.titulo,
            url: `apuntes.html?asig=${encodeURIComponent(asig.id)}&tema=${encodeURIComponent(tema.id)}`,
          };
        }
      }
    }

    // Fallback si no está mapeado en APUNTES_CONFIG
    const [carpeta, fichero] = claveArchivo.split("/");
    return {
      texto: `${fichero || claveArchivo} (${carpeta || "apuntes"})`,
      tituloCompleto: claveArchivo,
      url: "apuntes.html",
    };
  }

  function inyectarEstilos() {
    if (document.getElementById("mbc-changelog-css")) return;
    const style = document.createElement("style");
    style.id = "mbc-changelog-css";
    style.textContent = `
      .mbc-changelog {
        margin-top: 18px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 12px 16px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      }
      .mbc-changelog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 12px;
        font-weight: 600;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.4px;
      }
      .mbc-changelog-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .mbc-changelog-item a {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 5px 8px;
        border-radius: 5px;
        text-decoration: none;
        color: var(--text);
        font-size: 13px;
        transition: background 0.15s ease;
      }
      .mbc-changelog-item a:hover {
        background: var(--badge-bg);
      }
      .mbc-changelog-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 500;
      }
      .mbc-changelog-item a:hover .mbc-changelog-name {
        color: var(--accent);
      }
      .mbc-changelog-time {
        flex-shrink: 0;
        font-size: 11.5px;
        color: var(--muted);
      }
    `;
    document.head.appendChild(style);
  }

  function init() {
    if (typeof window.FECHAS_APUNTES === "undefined") return;

    const grid = document.querySelector(".grid-tools");
    if (!grid || !grid.parentNode) return;

    const recientes = Object.entries(window.FECHAS_APUNTES)
      .filter(([clave]) => clave !== "enproceso.md")
      .map(([clave, fechaIso]) => ({
        clave,
        fechaIso,
        ts: new Date(fechaIso).getTime(),
      }))
      .filter((item) => !Number.isNaN(item.ts))
      .sort((a, b) => b.ts - a.ts)
      .slice(0, MAX_ITEMS);

    if (recientes.length === 0) return;

    inyectarEstilos();

    const section = document.createElement("section");
    section.className = "mbc-changelog";
    section.setAttribute("aria-label", "Últimas actualizaciones del temario");

    const itemsHtml = recientes
      .map((item) => {
        const info = resolverTema(item.clave);
        const rel = tiempoRelativo(item.fechaIso);
        return `
          <li class="mbc-changelog-item">
            <a href="${info.url}" title="${info.tituloCompleto}">
              <span class="mbc-changelog-name">📝 ${info.texto}</span>
              <span class="mbc-changelog-time">${rel}</span>
            </a>
          </li>
        `;
      })
      .join("");

    section.innerHTML = `
      <div class="mbc-changelog-header">
        <span>🕒 Últimas modificaciones</span>
      </div>
      <ul class="mbc-changelog-list">
        ${itemsHtml}
      </ul>
    `;

    grid.insertAdjacentElement("afterend", section);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
