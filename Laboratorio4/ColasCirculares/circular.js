(() => {
  "use strict";

  const BASE = window.API_BASE || "https://laboratorios-aed-backend.onrender.com";
  const $ = id => document.getElementById(id);
  const elements = {
    themeBtn: $("btnThemeToggle"),
    serverStatus: $("server-status"),
    jobInput: $("job-name-input"),
    insert: $("btn-enqueue"),
    print: $("btn-dequeue"),
    next: $("btn-front"),
    state: $("btn-state"),
    message: $("message"),
    capacity: $("capacity-display"),
    track: $("circle-track"),
    frente: $("ptr-frente"),
    fin: $("ptr-fin"),
    proximo: $("ptr-proximo")
  };

  const SESSION_KEY = "aed_lab4_circular_sesion";
  let sessionId = sessionStorage.getItem(SESSION_KEY) || "";

  function syncTheme() {
    const isDark = document.documentElement.classList.contains("dark-mode");
    document.body.classList.toggle("dark-mode", isDark);
    if (elements.themeBtn) {
      elements.themeBtn.textContent = isDark ? "☀️ Modo Claro" : "🌙 Modo Oscuro";
      elements.themeBtn.setAttribute("aria-pressed", String(isDark));
    }
  }

  elements.themeBtn?.addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    syncTheme();
  });
  syncTheme();

  async function checkServer() {
    if (!elements.serverStatus) return;
    try {
      const response = await fetch(`${BASE}/lab4`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      elements.serverStatus.textContent = "● Servidor Java conectado";
      elements.serverStatus.className = "server-status online";
    } catch {
      elements.serverStatus.textContent = "● Servidor Java desconectado";
      elements.serverStatus.className = "server-status offline";
    }
  }

  function renderQueue(estado) {
    const cantidad = Number(estado.cantidad);
    const capacidad = Number(estado.capacidad);
    const frente = Number(estado.frente);
    const fin = Number(estado.fin);
    const posiciones = estado.posiciones;
    if (!Array.isArray(posiciones) || posiciones.length !== capacidad) {
      throw new Error("El servidor no devolvió las posiciones físicas de la cola.");
    }

    if (elements.capacity) elements.capacity.textContent = `${cantidad} / ${capacidad} trabajos`;
    if (elements.frente) elements.frente.textContent = String(frente);
    if (elements.fin) elements.fin.textContent = String(fin);
    if (elements.proximo) elements.proximo.textContent = estado.proximo ?? "—";

    for (let index = 0; index < posiciones.length; index++) {
      const slot = elements.track?.querySelector(`.circle-slot[data-index="${index}"]`);
      if (!slot) continue;

      const trabajo = posiciones[index];
      const ocupado = trabajo !== null && trabajo !== undefined;
      const isFront = ocupado && index === frente;
      const isFinal = ocupado && index === fin;
      slot.className = `circle-slot${ocupado ? " occupied" : ""}${isFront ? " is-front" : ""}${isFinal ? " is-final" : ""}`;
      slot.setAttribute("aria-label", `Estación ${index + 1}, ${ocupado ? String(trabajo) : "vacía"}${isFront ? ", frente" : ""}${isFinal ? ", final" : ""}`);

      const indexLabel = document.createElement("span");
      indexLabel.className = "slot-index";
      indexLabel.textContent = `[${index}]`;
      const value = document.createElement("span");
      value.className = ocupado ? "slot-value" : "slot-value slot-empty-label";
      value.textContent = ocupado ? String(trabajo) : "(vacío)";
      slot.replaceChildren(indexLabel, value);
    }
  }

  function setLoading(loading) {
    for (const button of [elements.insert, elements.print, elements.next, elements.state]) {
      if (button) button.disabled = loading;
    }
  }

  async function requestOperation(operacion, extraParams = {}, retryInvalidSession = true) {
    setLoading(true);
    const form = new URLSearchParams({ operacion, ...extraParams });
    if (sessionId) form.append("sesion", sessionId);

    try {
      const response = await fetch(`${BASE}/lab4/circular`, {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: form
      });
      const raw = await response.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(response.ok ? "El servidor devolvió una respuesta inválida." : `Error HTTP ${response.status}: ${raw}`);
      }

      if (data.sesion) {
        sessionId = String(data.sesion);
        sessionStorage.setItem(SESSION_KEY, sessionId);
      }

      if (!response.ok || data.error) {
        const error = String(data.error || `Error HTTP ${response.status}`);
        if (retryInvalidSession && error.includes("identificador de sesión no es válido")) {
          sessionId = "";
          sessionStorage.removeItem(SESSION_KEY);
          return await requestOperation(operacion, extraParams, false);
        }
        if (elements.message) elements.message.textContent = `Aviso: ${error}`;
        return;
      }

      if (data.estado) renderQueue(data.estado);
      switch (operacion) {
        case "insertar":
          if (elements.message) elements.message.textContent = `Trabajo "${data.elemento || ""}" añadido a la cola de impresión.`;
          if (elements.jobInput) {
            elements.jobInput.value = "";
            elements.jobInput.focus();
          }
          break;
        case "eliminar":
          if (elements.message) elements.message.textContent = `Trabajo "${data.elemento || ""}" impreso.`;
          break;
        case "proximo":
          if (elements.message) elements.message.textContent = `Próximo trabajo: "${data.elemento || ""}".`;
          break;
        case "estado":
          if (elements.message) {
            const total = Number(data.estado?.cantidad ?? 0);
            elements.message.textContent = total === 0
              ? "Cola circular vacía. Lista para recibir trabajos."
              : `Cola sincronizada. Hay ${total} trabajo${total === 1 ? "" : "s"} en espera.`;
          }
          break;
      }
    } catch (error) {
      if (elements.message) elements.message.textContent = `No se pudo completar la operación: ${error.message}`;
    } finally {
      setLoading(false);
    }
  }

  elements.insert?.addEventListener("click", () => {
    const trabajo = elements.jobInput?.value.trim() || "";
    if (!trabajo) {
      if (elements.message) elements.message.textContent = "Escribe el nombre del trabajo de impresión.";
      elements.jobInput?.focus();
      return;
    }
    requestOperation("insertar", { trabajo });
  });
  elements.print?.addEventListener("click", () => requestOperation("eliminar"));
  elements.next?.addEventListener("click", () => requestOperation("proximo"));
  elements.state?.addEventListener("click", () => requestOperation("estado"));
  elements.jobInput?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      elements.insert?.click();
    }
  });

  checkServer();
  requestOperation("estado");
})();
