(() => {
  "use strict";

  const BASE = window.API_BASE || "https://laboratorios-aed-backend.onrender.com";
  const $ = id => document.getElementById(id);
  const elements = {
    themeBtn: $("btnThemeToggle"),
    serverStatus: $("server-status"),
    personInput: $("person-name-input"),
    insert: $("btn-enqueue"),
    attend: $("btn-dequeue"),
    next: $("btn-front"),
    state: $("btn-state"),
    message: $("message"),
    capacity: $("capacity-display"),
    queue: $("queue-row"),
    frente: $("ptr-frente"),
    fin: $("ptr-fin"),
    proximo: $("ptr-proximo")
  };

  const SESSION_KEY = "aed_lab4_cola_sesion";
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
    const cantidad = Number(estado?.cantidad ?? 0);
    const capacidad = Number(estado?.capacidad ?? 5);
    const frente = Number(estado?.frente ?? -1);
    const fin = Number(estado?.fin ?? -1);
    const personas = Array.isArray(estado?.elementos) ? estado.elementos : [];

    if (elements.capacity) elements.capacity.textContent = `${cantidad} / ${capacidad} personas`;
    if (elements.frente) elements.frente.textContent = String(frente);
    if (elements.fin) elements.fin.textContent = String(fin);
    if (elements.proximo) elements.proximo.textContent = estado?.proximo ?? "—";

    for (let index = 0; index < capacidad; index++) {
      const slot = elements.queue?.querySelector(`.queue-slot[data-index="${index}"]`);
      if (!slot) continue;
      slot.replaceChildren();
      const indexLabel = document.createElement("span");
      indexLabel.className = "slot-index";
      indexLabel.textContent = `[${index}]`;
      slot.append(indexLabel);

      const offset = index - frente;
      const persona = offset >= 0 && offset < personas.length ? personas[offset] : null;
      if (persona !== null && persona !== undefined) {
        const isFront = index === frente;
        slot.className = `queue-slot occupied${isFront ? " is-front" : ""}`;
        const value = document.createElement("span");
        value.className = "slot-value";
        value.textContent = String(persona);
        slot.append(value);
        if (isFront) {
          const badge = document.createElement("span");
          badge.className = "front-indicator";
          badge.textContent = "Frente";
          slot.append(badge);
        }
      } else {
        slot.className = "queue-slot";
        const empty = document.createElement("span");
        empty.className = "slot-empty-label";
        empty.textContent = "(vacío)";
        slot.append(empty);
      }
    }
  }

  function setLoading(loading) {
    for (const button of [elements.insert, elements.attend, elements.next, elements.state]) {
      if (button) button.disabled = loading;
    }
  }

  async function requestOperation(operacion, extraParams = {}) {
    setLoading(true);
    const form = new URLSearchParams({ operacion, ...extraParams });
    if (sessionId) form.append("sesion", sessionId);

    try {
      const response = await fetch(`${BASE}/lab4/cola`, {
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
        if (error.includes("sesión no es válido") || error.includes("sesión expiró")) {
          sessionId = "";
          sessionStorage.removeItem(SESSION_KEY);
          return requestOperation(operacion, extraParams);
        }
        if (elements.message) elements.message.textContent = `Aviso: ${error}`;
        return;
      }

      if (data.estado) renderQueue(data.estado);
      switch (operacion) {
        case "insertar":
          if (elements.message) elements.message.textContent = `Persona "${data.elemento || ""}" agregada al final de la cola.`;
          if (elements.personInput) {
            elements.personInput.value = "";
            elements.personInput.focus();
          }
          break;
        case "eliminar":
          if (elements.message) elements.message.textContent = `Se atendió a "${data.elemento || ""}".`;
          break;
        case "proximo":
          if (elements.message) elements.message.textContent = `Próxima persona por atender: "${data.elemento || ""}".`;
          break;
        case "estado":
          if (elements.message) {
            const total = Number(data.estado?.cantidad ?? 0);
            elements.message.textContent = total === 0
              ? "Cola vacía. Lista para insertar personas (capacidad: 5)."
              : `Cola sincronizada. Hay ${total} persona${total === 1 ? "" : "s"} en espera.`;
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
    const nombre = elements.personInput?.value.trim() || "";
    if (!nombre) {
      if (elements.message) elements.message.textContent = "Escribe el nombre de la persona que se agregará a la cola.";
      elements.personInput?.focus();
      return;
    }
    requestOperation("insertar", { nombre });
  });
  elements.attend?.addEventListener("click", () => requestOperation("eliminar"));
  elements.next?.addEventListener("click", () => requestOperation("proximo"));
  elements.state?.addEventListener("click", () => requestOperation("estado"));
  elements.personInput?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      elements.insert?.click();
    }
  });

  renderQueue({ cantidad: 0, capacidad: 5, frente: -1, fin: -1, proximo: null, elementos: [] });
  checkServer();
  requestOperation("estado");
})();
