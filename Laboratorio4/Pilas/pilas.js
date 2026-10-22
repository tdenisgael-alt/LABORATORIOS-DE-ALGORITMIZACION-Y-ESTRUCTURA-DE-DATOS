(() => {
  const BASE = window.API_BASE || "https://laboratorios-aed-backend.onrender.com";
  const $ = id => document.getElementById(id);

  // Elementos del DOM
  const elements = {
    themeBtn: $("btnThemeToggle"),
    serverStatus: $("server-status"),
    mallInput: $("mall-name-input"),
    btnPush: $("btn-push"),
    btnPop: $("btn-pop"),
    btnPeek: $("btn-peek"),
    message: $("message"),
    capacityDisplay: $("capacity-display"),
    stackColumn: $("stack-column")
  };

  // Identificador de sesión para el usuario en este cliente
  const STORAGE_KEY = "aed_lab4_pila_sesion";
  let sessionId = sessionStorage.getItem(STORAGE_KEY) || "";

  // --------------------------------------------------------------------------
  // TEMA (MODO OSCURO / CLARO)
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // COMPROBACIÓN DEL SERVIDOR JAVA (GET /lab4)
  // --------------------------------------------------------------------------
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
  checkServer();

  // --------------------------------------------------------------------------
  // RENDERIZADO VISUAL: 5 POSICIONES, TOPE, CAPACIDAD Y ESTADO
  // --------------------------------------------------------------------------
  // El backend retorna estado.elementos donde elementos[0] es la CIMA (tope).
  // La posición física de la pila va de [0] (base/fondo) a [4] (cima máxima).
  // Por ende:
  // Si hay K elementos:
  //   - La base [0] contiene el elemento más antiguo: elementos[K - 1].
  //   - La posición [K - 1] contiene la cima actual: elementos[0].
  function renderStack(estado) {
    const cantidad = Number(estado?.cantidad ?? 0);
    const capacidad = Number(estado?.capacidad ?? 5);
    const elementosArr = Array.isArray(estado?.elementos) ? estado.elementos : [];
    const cimaValor = estado?.cima ?? (elementosArr.length > 0 ? elementosArr[0] : null);

    // Actualizar indicador de capacidad
    if (elements.capacityDisplay) {
      elements.capacityDisplay.textContent = `${cantidad} / ${capacidad} elementos`;
    }

    // Reconstruir orden de fondo a tope:
    // fondo = index 0 en la vista, tope = index cantidad-1 en la vista.
    const deFondoATope = [...elementosArr].reverse();

    // Actualizar cada uno de los 5 slots visuales [0..4]
    for (let slotIndex = 0; slotIndex < 5; slotIndex++) {
      const slotEl = elements.stackColumn?.querySelector(`.stack-slot[data-index="${slotIndex}"]`);
      if (!slotEl) continue;

      // Limpiar contenido previo del slot
      slotEl.innerHTML = "";

      const hasValue = slotIndex < cantidad && slotIndex < deFondoATope.length;
      const isTop = slotIndex === cantidad - 1 && cantidad > 0;

      if (hasValue) {
        const val = deFondoATope[slotIndex];
        slotEl.className = `stack-slot occupied${isTop ? " is-top" : ""}`;

        const indexSpan = document.createElement("span");
        indexSpan.className = "slot-index";
        indexSpan.textContent = `[${slotIndex}]`;

        const valSpan = document.createElement("span");
        valSpan.className = "slot-value";
        valSpan.textContent = String(val);

        slotEl.append(indexSpan, valSpan);

        if (isTop) {
          const topBadge = document.createElement("span");
          topBadge.className = "top-indicator";
          topBadge.textContent = "Tope";
          slotEl.append(topBadge);
        }
      } else {
        slotEl.className = "stack-slot";

        const indexSpan = document.createElement("span");
        indexSpan.className = "slot-index";
        indexSpan.textContent = `[${slotIndex}]`;

        const emptySpan = document.createElement("span");
        emptySpan.className = "slot-empty-label";
        emptySpan.textContent = "(vacío)";

        slotEl.append(indexSpan, emptySpan);
      }
    }
  }

  // --------------------------------------------------------------------------
  // PETICIÓN AL BACKEND JAVA MEDIANTE POST /lab4/pila
  // --------------------------------------------------------------------------
  async function requestOperation(operacion, extraParams = {}) {
    setLoading(true);

    const bodyParams = new URLSearchParams({
      operacion,
      ...extraParams
    });

    // Enviar identificador de sesión como parámetro para soportar persistencia
    // confiable sin depender de cookies third-party entre distintos orígenes
    if (sessionId) {
      bodyParams.append("sesion", sessionId);
    }

    try {
      // La sesión viaja explícitamente en el formulario. Omitir cookies evita que
      // CORS bloquee la respuesta y que una operación mutante se reintente dos veces.
      const response = await fetch(`${BASE}/lab4/pila`, {
        method: "POST",
        credentials: "omit",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: bodyParams
      });

      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          response.ok
            ? `Respuesta no estructurada del servidor: "${rawText}".`
            : `Error HTTP ${response.status}: ${rawText}`
        );
      }

      // Guardar o renovar ID de sesión devuelto por Java
      if (data.sesion) {
        sessionId = String(data.sesion);
        sessionStorage.setItem(STORAGE_KEY, sessionId);
      }

      // Manejo de errores devueltos por la lógica de Java
      if (!response.ok || data.error) {
        const errorMsg = data.error || `Error HTTP ${response.status}`;

        // Si la sesión expiró o es inválida, se limpia y se reintenta automáticamente
        if (errorMsg.includes("sesión no es válido") || errorMsg.includes("sesión expiró")) {
          sessionId = "";
          sessionStorage.removeItem(STORAGE_KEY);
          return requestOperation(operacion, extraParams);
        }

        if (elements.message) {
          elements.message.textContent = `Aviso: ${errorMsg}`;
        }
        return;
      }

      // Procesar respuesta exitosa según la operación ejecutada
      if (data.estado) {
        renderStack(data.estado);
      }

      switch (operacion) {
        case "insertar":
          if (elements.message) {
            elements.message.textContent = `Elemento "${data.elemento || ""}" apilado exitosamente.`;
          }
          if (elements.mallInput) {
            elements.mallInput.value = "";
            elements.mallInput.focus();
          }
          break;

        case "eliminar":
          if (elements.message) {
            elements.message.textContent = `Elemento "${data.elemento || ""}" desapilado exitosamente.`;
          }
          break;

        case "cima":
          if (elements.message) {
            elements.message.textContent = `Cima actual de la pila: "${data.elemento || data.estado?.cima || ""}".`;
          }
          break;

        case "estado":
        default:
          if (elements.message) {
            const cant = data.estado?.cantidad ?? 0;
            elements.message.textContent = cant === 0
              ? "Pila vacía. Lista para insertar elementos (capacidad: 5)."
              : `Pila sincronizada. Contiene ${cant} elemento${cant === 1 ? "" : "s"}.`;
          }
          break;
      }
    } catch (err) {
      if (elements.message) {
        elements.message.textContent = `No se pudo completar la operación: ${err.message}`;
      }
    } finally {
      setLoading(false);
    }
  }

  function setLoading(loading) {
    if (elements.btnPush) elements.btnPush.disabled = loading;
    if (elements.btnPop) elements.btnPop.disabled = loading;
    if (elements.btnPeek) elements.btnPeek.disabled = loading;
  }

  // --------------------------------------------------------------------------
  // MANEJADORES DE EVENTOS
  // --------------------------------------------------------------------------
  elements.btnPush?.addEventListener("click", () => {
    const nombre = elements.mallInput ? elements.mallInput.value.trim() : "";
    if (!nombre) {
      if (elements.message) {
        elements.message.textContent = "Por favor, escribe el nombre del centro comercial a insertar.";
      }
      elements.mallInput?.focus();
      return;
    }
    requestOperation("insertar", { nombre });
  });

  elements.btnPop?.addEventListener("click", () => {
    requestOperation("eliminar");
  });

  elements.btnPeek?.addEventListener("click", () => {
    requestOperation("cima");
  });

  elements.mallInput?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      elements.btnPush?.click();
    }
  });

  // Consultar estado inicial real de la pila al cargar
  requestOperation("estado");
})();
