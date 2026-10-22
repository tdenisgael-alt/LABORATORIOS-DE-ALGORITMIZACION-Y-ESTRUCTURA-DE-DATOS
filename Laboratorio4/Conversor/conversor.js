(() => {
  const BASE = window.API_BASE || "https://laboratorios-aed-backend.onrender.com";
  const $ = id => document.getElementById(id);

  // Elementos del DOM
  const elements = {
    themeBtn: $("btnThemeToggle"),
    serverStatus: $("server-status"),
    exprInput: $("expression-input"),
    btnPrefix: $("btn-prefix"),
    btnPostfix: $("btn-postfix"),
    btnClear: $("btn-clear"),
    message: $("message"),
    resultDisplay: $("result-display"),
    stackColumn: $("stack-column"),
    historyToggle: $("history-toggle"),
    historyBackdrop: $("history-backdrop"),
    historyPanel: $("history-panel"),
    historyClose: $("history-close"),
    historyEmpty: $("history-empty"),
    historyTableContainer: $("history-table-container"),
    historyTbody: $("history-tbody"),
    stepPrev: $("step-prev"),
    stepNext: $("step-next")
  };

  // Estado reactivo
  const state = {
    tipo: "postfija", // "prefija" o "postfija"
    resultado: "",
    pasos: [],        // Pasos recibidos de Java: [{ simbolo, pila, salida }]
    index: 0,         // Índice del paso actual en la simulación paso a paso
    cargando: false
  };

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
  // PANEL FLOTANTE DE HISTORIAL (ACCESIBLE: X, CLIC FUERA, ESCAPE, TOGGLE)
  // --------------------------------------------------------------------------
  function openHistory() {
    if (!elements.historyPanel) return;
    elements.historyPanel.hidden = false;
    if (elements.historyBackdrop) elements.historyBackdrop.hidden = false;
    elements.historyToggle?.setAttribute("aria-expanded", "true");
    elements.historyClose?.focus();
    scrollCurrentStepIntoView();
  }

  function closeHistory() {
    if (!elements.historyPanel || elements.historyPanel.hidden) return;
    elements.historyPanel.hidden = true;
    if (elements.historyBackdrop) elements.historyBackdrop.hidden = true;
    elements.historyToggle?.setAttribute("aria-expanded", "false");
    elements.historyToggle?.focus();
  }

  function toggleHistory() {
    if (elements.historyPanel?.hidden) {
      openHistory();
    } else {
      closeHistory();
    }
  }

  elements.historyToggle?.addEventListener("click", toggleHistory);
  elements.historyClose?.addEventListener("click", closeHistory);
  elements.historyBackdrop?.addEventListener("click", closeHistory);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && elements.historyPanel && !elements.historyPanel.hidden) {
      closeHistory();
    }
  });

  document.addEventListener("click", event => {
    if (!elements.historyPanel || elements.historyPanel.hidden) return;
    const clickedInside = elements.historyPanel.contains(event.target);
    const clickedToggle = elements.historyToggle?.contains(event.target);
    const clickedBackdrop = elements.historyBackdrop?.contains(event.target);
    if (!clickedInside && !clickedToggle && !clickedBackdrop) {
      closeHistory();
    }
  });

  function scrollCurrentStepIntoView() {
    if (!elements.historyPanel || elements.historyPanel.hidden) return;
    const current = elements.historyTbody?.querySelector(".current-step");
    if (current) {
      current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  // --------------------------------------------------------------------------
  // INSPECCIÓN Y NORMALIZACIÓN DE PASOS RECIBIDOS DEL JSON DE JAVA
  // --------------------------------------------------------------------------
  function parseStackElements(stackVal) {
    if (!stackVal) return [];
    if (Array.isArray(stackVal)) {
      return stackVal.map(String).filter(Boolean);
    }
    let str = String(stackVal).trim();
    if (!str || str === "[]" || /\[\s*vac[ií]a\s*\]/i.test(str) || /^vac[ií]a$/i.test(str)) {
      return [];
    }
    // Quita corchetes si vienen en formato "[ + | * ]" o "[A, B, C]"
    str = str.replace(/^\[/, "").replace(/\]$/, "").trim();
    if (!str || /vac[ií]a/i.test(str)) return [];

    // Soporta separador de tubería '|' (Java backend), comas ',' o espacios
    if (str.includes("|")) {
      return str
        .split("|")
        .map(s => s.trim())
        .filter(Boolean);
    }
    return str
      .split(/[,;\s]+/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  function normalizeStep(rawStep, idx) {
    if (typeof rawStep !== "object" || rawStep === null) {
      return {
        numero: idx + 1,
        simbolo: String(rawStep),
        accion: "",
        pila: [],
        salida: ""
      };
    }
    const simbolo = rawStep.elemento ?? rawStep.simbolo ?? rawStep.token ?? rawStep.caracter ?? rawStep.char ?? "";
    const accion = rawStep.accion ?? rawStep.descripcion ?? rawStep.operacion ?? "";
    const rawPila = rawStep.estadoPila ?? rawStep.pila ?? rawStep.stack ?? rawStep.tope ?? [];
    const salida = rawStep.resultadoParcial ?? rawStep.salida ?? rawStep.expresion ?? rawStep.output ?? "";
    const numero = rawStep.numero ?? rawStep.paso ?? rawStep.indice ?? (idx + 1);

    return {
      numero: Number(numero) || (idx + 1),
      simbolo: String(simbolo),
      accion: String(accion),
      pila: parseStackElements(rawPila),
      salida: String(salida)
    };
  }

  // --------------------------------------------------------------------------
  // RENDERIZADO VISUAL: PILA, HISTORIAL Y RESULTADO
  // --------------------------------------------------------------------------
  function renderStack(stackArray) {
    if (!elements.stackColumn) return;
    elements.stackColumn.innerHTML = "";

    if (!stackArray || stackArray.length === 0) {
      const emptyNote = document.createElement("span");
      emptyNote.className = "stack-empty-placeholder";
      emptyNote.textContent = "(Pila vacía)";
      elements.stackColumn.append(emptyNote);
      return;
    }

    stackArray.forEach((elem, i) => {
      const item = document.createElement("div");
      const isTop = i === stackArray.length - 1;
      item.className = `stack-element${isTop ? " top-item" : ""}`;
      item.textContent = elem;
      if (isTop) {
        item.title = `Tope: ${elem}`;
      }
      elements.stackColumn.append(item);
    });
  }

  function renderHistory() {
    if (!elements.historyTbody) return;
    elements.historyTbody.innerHTML = "";

    if (!state.pasos || state.pasos.length === 0) {
      if (elements.historyEmpty) elements.historyEmpty.hidden = false;
      if (elements.historyTableContainer) elements.historyTableContainer.hidden = true;
      return;
    }

    if (elements.historyEmpty) elements.historyEmpty.hidden = true;
    if (elements.historyTableContainer) elements.historyTableContainer.hidden = false;

    // Solo se muestran los pasos hasta el paso actual (index)
    const pasosVisibles = state.pasos.slice(0, state.index + 1);

    pasosVisibles.forEach((step, idx) => {
      const tr = document.createElement("tr");
      const isCurrent = idx === state.index;
      if (isCurrent) tr.className = "current-step";

      const tdNum = document.createElement("td");
      tdNum.textContent = String(step.numero || idx + 1);

      const tdSimbolo = document.createElement("td");
      tdSimbolo.textContent = step.simbolo || "—";

      const tdPila = document.createElement("td");
      tdPila.textContent = step.pila.length > 0 ? `[ ${step.pila.join(", ")} ]` : "[ ]";

      const tdSalida = document.createElement("td");
      tdSalida.textContent = step.salida || "";

      tr.append(tdNum, tdSimbolo, tdPila, tdSalida);
      elements.historyTbody.append(tr);
    });

    scrollCurrentStepIntoView();
  }

  function updateControls() {
    const hasSteps = state.pasos.length > 0;
    if (elements.stepPrev) {
      elements.stepPrev.disabled = !hasSteps || state.index <= 0 || state.cargando;
    }
    if (elements.stepNext) {
      elements.stepNext.disabled = !hasSteps || state.index >= state.pasos.length - 1 || state.cargando;
    }
  }

  function renderCurrentStep() {
    if (!state.pasos || state.pasos.length === 0) {
      renderStack([]);
      renderHistory();
      updateControls();
      return;
    }

    const currentStep = state.pasos[state.index];
    if (currentStep) {
      renderStack(currentStep.pila);
      renderHistory();
      if (elements.resultDisplay) {
        elements.resultDisplay.textContent = currentStep.salida || state.resultado || "—";
      }
      if (elements.message) {
        const accionTexto = currentStep.accion ? ` · ${currentStep.accion}` : "";
        elements.message.textContent = `Paso ${state.index + 1} de ${state.pasos.length}: elemento "${currentStep.simbolo || ""}"${accionTexto}`;
      }
    }
    updateControls();
  }

  // --------------------------------------------------------------------------
  // CONEXIÓN CON JAVA MEDIANTE POST /lab4/conversor
  // --------------------------------------------------------------------------
  async function requestConversion(tipoDestino) {
    const expresion = elements.exprInput ? elements.exprInput.value.trim() : "";
    if (!expresion) {
      if (elements.message) elements.message.textContent = "Por favor, ingresa una expresión infija.";
      elements.exprInput?.focus();
      return;
    }

    state.tipo = tipoDestino;
    state.cargando = true;
    updateTypeButtons();

    if (elements.message) {
      elements.message.textContent = `Enviando expresión a Java para conversión a ${tipoDestino}...`;
    }
    if (elements.resultDisplay) elements.resultDisplay.textContent = "...";

    // Bloquear botones durante la petición
    if (elements.btnPrefix) elements.btnPrefix.disabled = true;
    if (elements.btnPostfix) elements.btnPostfix.disabled = true;
    updateControls();

    try {
      const params = new URLSearchParams({
        expresion,
        tipo: tipoDestino
      });

      const response = await fetch(`${BASE}/lab4/conversor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: params
      });

      // Inspección de la respuesta antes de usar los datos
      const rawText = await response.text();
      let data = null;

      try {
        data = JSON.parse(rawText);
      } catch {
        // La respuesta no es JSON válido (ej. endpoint aún no implementado en el backend de Render)
        throw new Error(
          response.ok
            ? `El servidor devolvió texto no estructurado ("${rawText}"). Ejecuta Servidor.java con el endpoint /lab4/conversor.`
            : `Error HTTP ${response.status}: ${rawText}`
        );
      }

      if (!response.ok || data.error) {
        throw new Error(data.error || `Error HTTP ${response.status}`);
      }

      // Inspección y extracción flexible de campos del JSON
      const resultadoFinal = data.resultado ?? data.expresion ?? data.salida ?? data.postfija ?? data.prefija ?? "";
      const rawSteps = data.pasos ?? data.historial ?? data.steps ?? data.movimientos ?? [];

      state.resultado = String(resultadoFinal);
      state.pasos = Array.isArray(rawSteps) ? rawSteps.map(normalizeStep) : [];

      // Si Java retornó solo el resultado sin desglose de pasos, se añade el paso final
      if (state.pasos.length === 0 && state.resultado) {
        state.pasos = [{
          numero: 1,
          simbolo: "Fin",
          pila: [],
          salida: state.resultado
        }];
      }

      state.index = state.pasos.length > 0 ? state.pasos.length - 1 : 0;

      if (elements.resultDisplay) {
        elements.resultDisplay.textContent = state.resultado || "—";
      }

      if (elements.message) {
        elements.message.textContent = `Conversión a ${tipoDestino} completada exitosamente desde Java (${state.pasos.length} pasos).`;
      }

      renderCurrentStep();
    } catch (err) {
      if (elements.message) {
        elements.message.textContent = `No se pudo convertir: ${err.message}`;
      }
      if (elements.resultDisplay) {
        elements.resultDisplay.textContent = "Error";
      }
      state.pasos = [];
      state.resultado = "";
      state.index = 0;
      renderCurrentStep();
    } finally {
      state.cargando = false;
      if (elements.btnPrefix) elements.btnPrefix.disabled = false;
      if (elements.btnPostfix) elements.btnPostfix.disabled = false;
      updateControls();
    }
  }

  function updateTypeButtons() {
    if (elements.btnPrefix) {
      elements.btnPrefix.classList.toggle("active", state.tipo === "prefija");
    }
    if (elements.btnPostfix) {
      elements.btnPostfix.classList.toggle("active", state.tipo === "postfija");
    }
  }

  // --------------------------------------------------------------------------
  // NAVEGACIÓN PASO A PASO (ANTERIOR / SIGUIENTE)
  // --------------------------------------------------------------------------
  function stepPrevious() {
    if (state.index > 0) {
      state.index -= 1;
      renderCurrentStep();
    }
  }

  function stepNext() {
    if (state.index < state.pasos.length - 1) {
      state.index += 1;
      renderCurrentStep();
    }
  }

  // --------------------------------------------------------------------------
  // LIMPIEZA
  // --------------------------------------------------------------------------
  function clearAll() {
    if (elements.exprInput) {
      elements.exprInput.value = "";
      elements.exprInput.focus();
    }
    state.resultado = "";
    state.pasos = [];
    state.index = 0;
    if (elements.resultDisplay) elements.resultDisplay.textContent = "—";
    if (elements.message) elements.message.textContent = "Listo para convertir. Ingresa una expresión y selecciona el modo.";
    renderCurrentStep();
  }

  // --------------------------------------------------------------------------
  // EVENT LISTENERS
  // --------------------------------------------------------------------------
  elements.btnPrefix?.addEventListener("click", () => requestConversion("prefija"));
  elements.btnPostfix?.addEventListener("click", () => requestConversion("postfija"));
  elements.btnClear?.addEventListener("click", clearAll);
  elements.stepPrev?.addEventListener("click", stepPrevious);
  elements.stepNext?.addEventListener("click", stepNext);

  elements.exprInput?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      requestConversion(state.tipo);
    }
  });

  // Estado inicial limpio
  renderCurrentStep();
})();

