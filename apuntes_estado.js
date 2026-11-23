(function () {
  "use strict";

  const STORAGE_KEY = "mbc_apuntes_visitas_v1";
  const AUTO_HIDE_MS = 14000; // 14 segundos (< 20s)

  // Formateo humano relativo y absoluto en español
  function formatearFechaHumana(isoString) {
    if (!isoString) return "Fecha desconocida";
    const fecha = new Date(isoString);
    if (Number.isNaN(fecha.getTime())) return isoString;

    const ahora = new Date();
    const diffMs = ahora - fecha;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    const horaStr = fecha.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });

    let relativo = "";
    if (diffMin < 1) {
      relativo = "hace un momento";
    } else if (diffMin < 60) {
      relativo = `hace ${diffMin} min`;
    } else if (diffHoras < 24 && fecha.getDate() === ahora.getDate()) {
      relativo = `hoy a las ${horaStr}`;
    } else if (diffDias <= 1 && new Date(ahora - 86400000).getDate() === fecha.getDate()) {
      relativo = `ayer a las ${horaStr}`;
    } else if (diffDias < 7) {
      relativo = `hace ${diffDias} días`;
    } else {
      relativo = fecha.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }

    const completa = fecha.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${relativo} (${completa})`;
  }

  function leerVisitas() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function guardarVisita(claveArchivo) {
    if (!claveArchivo) return;
    try {
      const visitas = leerVisitas();
      visitas[claveArchivo] = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visitas));
    } catch {
      // Ignorar si el almacenamiento está lleno o bloqueado
    }
  }

  // Busca metadatos legibles en APUNTES_CONFIG a partir de "civil/001.md"
  function resolverInfoTema(claveArchivo) {
    if (typeof APUNTES_CONFIG === "undefined") return null;
    const rutaCompleta = `apuntes/${claveArchivo}`;

    for (const asig of APUNTES_CONFIG) {
      const tema = asig.temas.find((t) => t.archivo === rutaCompleta);
      if (tema) {
        return {
          asigId: asig.id,
          asignatura: asig.asignatura,
          temaId: tema.id,
          titulo: tema.titulo,
        };
      }
    }
    return null;
  }

  // Detecta qué temas se han modificado después de la última visita del usuario
  function obtenerNovedades() {
    if (typeof window.FECHAS_APUNTES === "undefined") return [];
    const visitas = leerVisitas();
    const novedades = [];

    for (const [clave, fechaModIso] of Object.entries(window.FECHAS_APUNTES)) {
      if (clave === "enproceso.md") continue;
      const ultimaVisitaIso = visitas[clave];
      if (!ultimaVisitaIso) continue; // Solo avisa de temas que ya has consultado alguna vez

      const tMod = new Date(fechaModIso).getTime();
      const tVis = new Date(ultimaVisitaIso).getTime();
      if (!Number.isNaN(tMod) && !Number.isNaN(tVis) && tMod > tVis) {
        const info = resolverInfoTema(clave);
        novedades.push({
          clave,
          fechaModIso,
          info,
        });
      }
    }

    // Ordenar de más reciente a más antigua
    novedades.sort((a, b) => new Date(b.fechaModIso) - new Date(a.fechaModIso));
    return novedades;
  }

  function inyectarEstilos() {
    if (document.getElementById("mbc-status-styles")) return;
    const style = document.createElement("style");
    style.id = "mbc-status-styles";
    style.textContent = `
      #mbc-status-pill {
        position: fixed;
        bottom: 42px;
        left: 16px;
        z-index: 190;
        background: #1e293b;
        color: #f8fafc;
        border: 1px solid #334155;
        border-radius: 999px;
        padding: 6px 12px;
        font-size: 12px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
        opacity: 0.78;
        transition: opacity 0.2s ease, transform 0.2s ease;
        user-select: none;
      }
      #mbc-status-pill:hover {
        opacity: 1;
        transform: translateY(-1px);
      }
      #mbc-status-pill .mbc-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #38bdf8;
        display: none;
      }
      #mbc-status-pill.has-updates .mbc-dot {
        display: inline-block;
        background: #22c55e;
        box-shadow: 0 0 6px #22c55e;
      }

      #mbc-status-card {
        position: fixed;
        bottom: 80px;
        left: 16px;
        z-index: 195;
        width: min(360px, calc(100vw - 32px));
        background: #0f172a;
        color: #f1f5f9;
        border: 1px solid #334155;
        border-radius: 10px;
        padding: 12px 14px;
        font-size: 13px;
        line-height: 1.45;
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.32);
        display: none;
        animation: mbcSlideUp 0.22s ease-out;
      }
      #mbc-status-card.visible {
        display: block;
      }
      @keyframes mbcSlideUp {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .mbc-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        font-weight: 600;
        color: #94a3b8;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.4px;
      }
      .mbc-card-close {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 14px;
        padding: 2px 5px;
        border-radius: 4px;
      }
      .mbc-card-close:hover {
        background: #1e293b;
        color: #fff;
      }
      .mbc-mod-info {
        color: #e2e8f0;
        margin-bottom: 6px;
      }
      .mbc-mod-info strong {
        color: #38bdf8;
        font-weight: 600;
      }
      .mbc-updates-box {
        border-top: 1px solid #1e293b;
        margin-top: 8px;
        padding-top: 8px;
      }
      .mbc-updates-title {
        color: #4ade80;
        font-weight: 600;
        font-size: 12px;
        margin-bottom: 4px;
      }
      .mbc-updates-list {
        list-style: none;
        margin: 0;
        padding: 0;
        max-height: 130px;
        overflow-y: auto;
      }
      .mbc-updates-list li {
        padding: 4px 6px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 12px;
        color: #cbd5e1;
        transition: background 0.15s ease;
      }
      .mbc-updates-list li:hover {
        background: #1e293b;
        color: #fff;
      }
      @media print {
        #mbc-status-pill, #mbc-status-card {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function init() {
    inyectarEstilos();

    const selAsig = document.getElementById("select-asignatura");
    const selTema = document.getElementById("select-tema");
    if (!selAsig || !selTema) return;

    // Crear píldora discreta y tarjeta desplegable
    const pill = document.createElement("button");
    pill.type = "button";
    pill.id = "mbc-status-pill";
    pill.title = "Ver última modificación y novedades";
    pill.innerHTML = `<span class="mbc-dot"></span><span>🕒 Info</span>`;

    const card = document.createElement("div");
    card.id = "mbc-status-card";
    card.innerHTML = `
      <div class="mbc-card-header">
        <span>Estado del temario</span>
        <button type="button" class="mbc-card-close" title="Ocultar">✖</button>
      </div>
      <div id="mbc-card-body"></div>
    `;

    document.body.appendChild(pill);
    document.body.appendChild(card);

    const cardBody = document.getElementById("mbc-card-body");
    const closeBtn = card.querySelector(".mbc-card-close");
    let hideTimer = null;

    function ocultarTarjeta() {
      card.classList.remove("visible");
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    }

    function mostrarTarjeta(autoOcultar = true) {
      card.classList.add("visible");
      if (hideTimer) clearTimeout(hideTimer);
      if (autoOcultar) {
        hideTimer = setTimeout(ocultarTarjeta, AUTO_HIDE_MS);
      }
    }

    // Pausar el temporizador si pasas el ratón por encima para leer tranquilo
    card.addEventListener("mouseenter", () => {
      if (hideTimer) clearTimeout(hideTimer);
    });
    card.addEventListener("mouseleave", () => {
      if (card.classList.contains("visible")) {
        hideTimer = setTimeout(ocultarTarjeta, 6000);
      }
    });

    pill.addEventListener("click", () => {
      if (card.classList.contains("visible")) {
        ocultarTarjeta();
      } else {
        mostrarTarjeta(true);
      }
    });

    closeBtn.addEventListener("click", ocultarTarjeta);

    function abrirTemaDesdeAviso(asigId, temaId) {
      selAsig.value = asigId;
      selAsig.dispatchEvent(new Event("change"));
      selTema.value = temaId;
      selTema.dispatchEvent(new Event("change"));
    }

    function actualizarVista(claveActual = null) {
      const novedades = obtenerNovedades();
      if (novedades.length > 0) {
        pill.classList.add("has-updates");
      } else {
        pill.classList.remove("has-updates");
      }

      let html = "";

      // 1. Info de última modificación del tema abierto
      if (claveActual && typeof window.FECHAS_APUNTES !== "undefined") {
        const fechaIso = window.FECHAS_APUNTES[claveActual];
        const textoFecha = fechaIso
          ? formatearFechaHumana(fechaIso)
          : "Sin registro en GitHub";
        html += `<div class="mbc-mod-info">📅 Última modificación: <strong>${textoFecha}</strong></div>`;
      } else {
        html += `<div class="mbc-mod-info">Selecciona un tema para ver su última actualización.</div>`;
      }

      // 2. Novedades detectadas desde la última visita
      if (novedades.length > 0) {
        html += `<div class="mbc-updates-box">`;
        html += `<div class="mbc-updates-title">🔔 Actualizados desde tu última visita (${novedades.length}):</div>`;
        html += `<ul class="mbc-updates-list">`;

        novedades.forEach((nov, idx) => {
          const etiqueta = nov.info
            ? `Se ha modificado <strong>${nov.info.titulo.split(":")[0]}</strong> de ${nov.info.asignatura}`
            : `Se ha modificado <strong>${nov.clave}</strong>`;
          html += `<li data-nov-idx="${idx}">• ${etiqueta}</li>`;
        });

        html += `</ul></div>`;
      }

      cardBody.innerHTML = html;

      // Hacer clicables los avisos para saltar directo al tema actualizado
      cardBody.querySelectorAll("li[data-nov-idx]").forEach((li) => {
        li.addEventListener("click", () => {
          const idx = Number(li.getAttribute("data-nov-idx"));
          const item = novedades[idx];
          if (item && item.info) {
            abrirTemaDesdeAviso(item.info.asigId, item.info.temaId);
          }
        });
      });
    }

    // Escuchar cambios de tema sin tocar el código original de apuntes.html
    function onTemaSeleccionado() {
      const asigId = selAsig.value;
      const temaId = selTema.value;
      if (!asigId || !temaId || typeof APUNTES_CONFIG === "undefined") return;

      const asig = APUNTES_CONFIG.find((a) => a.id === asigId);
      const tema = asig ? asig.temas.find((t) => t.id === temaId) : null;
      if (!tema || !tema.archivo) return;

      const claveArchivo = tema.archivo.replace(/^\.?\/?apuntes\//i, "");

      // Primero comprobamos novedades antes de sobrescribir la visita actual
      actualizarVista(claveArchivo);
      mostrarTarjeta(true);

      // Guardamos la marca de tiempo de esta visita tras un breve margen (2s)
      // para que te dé tiempo a ver el aviso si justo entraste a ese mismo tema
      setTimeout(() => guardarVisita(claveArchivo), 2000);
    }

    selTema.addEventListener("change", onTemaSeleccionado);

    // Al entrar en apuntes.html (sin tema o antes de que cargue uno):
    // Si hay novedades pendientes, mostrar la notificación automáticamente durante 14s
    const novedadesIniciales = obtenerNovedades();
    actualizarVista(null);
    if (novedadesIniciales.length > 0 && !new URLSearchParams(window.location.search).get("tema")) {
      mostrarTarjeta(true);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
