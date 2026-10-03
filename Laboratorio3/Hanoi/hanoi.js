(() => {
  const BASE = "http://localhost:8080", $ = id => document.getElementById(id);
  const state = { mode: "automatic", moves: [], total: 0, index: 0, disks: 3, playing: false, timer: null, connected: false, animating: false, selected: null, soundEnabled: true, manual: { A: [], B: [], C: [] } };
  let manualHistory = [];
  let audioUnlocked = false;
  const hanoiSchoolAudio = new Audio("../assets/audio/hanoi_Escolar.mp3");
  hanoiSchoolAudio.volume = 0.30;

  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    const volume = hanoiSchoolAudio.volume;
    hanoiSchoolAudio.volume = 0;
    const started = hanoiSchoolAudio.play();
    if (!started) { hanoiSchoolAudio.volume = volume; return; }
    started.then(() => {
      hanoiSchoolAudio.pause();
      hanoiSchoolAudio.currentTime = 0;
      hanoiSchoolAudio.volume = volume;
    }).catch(() => { hanoiSchoolAudio.volume = volume; });
  }

  function stopHanoiAudio() {
    hanoiSchoolAudio.pause();
    hanoiSchoolAudio.currentTime = 0;
  }

  function playHanoiLandingSound() {
    if (!state.soundEnabled || !audioUnlocked || document.querySelector(".hanoi-card")?.dataset.style !== "escolar") return;
    stopHanoiAudio();
    hanoiSchoolAudio.play().catch(() => {});
  }

  const towers = () => state.mode === "manual" ? state.manual : derive(state.index);

  function derive(count) {
    const t = { A: Array.from({ length: state.disks }, (_, i) => state.disks - i), B: [], C: [] };
    for (let i = 0; i < count; i++) {
      const m = state.moves[i];
      if (m) t[m.destino].push(t[m.origen].pop());
    }
    return t;
  }

  function theme() {
    const d = document.documentElement.classList.contains("dark-mode");
    document.body.classList.toggle("dark-mode", d);
    $("btnThemeToggle").textContent = d ? "☀️ Modo Claro" : "🌙 Modo Oscuro";
  }

  $("btnThemeToggle").addEventListener("click", () => {
    document.documentElement.classList.toggle("dark-mode");
    localStorage.setItem("theme", document.documentElement.classList.contains("dark-mode") ? "dark" : "light");
    theme();
  });

  function resetManual() {
    manualHistory = [];
    state.manual = { A: Array.from({ length: state.disks }, (_, i) => state.disks - i), B: [], C: [] };
  }

  function setDisks(value) {
    if (state.animating) return;
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) return;
    const next = Math.max(1, Math.min(7, parsed));
    state.disks = next;
    $("disks").value = String(next);
    stop();
    state.moves = [];
    state.total = 0;
    state.index = 0;
    state.selected = null;
    resetManual();
    state.manual._count = 0;
    $("message").textContent = "Estado inicial · Discos en Torre A.";
    render();
    lock(state.animating);
  }

  function render() {
    const t = towers(), board = $("hanoi-board");
    board.innerHTML = "";
    ["A", "B", "C"].forEach(name => {
      const tower = document.createElement("div");
      tower.className = `hanoi-tower${state.selected === name ? " selected" : ""}`;
      tower.dataset.tower = name;

      const stack = document.createElement("div");
      stack.className = "hanoi-stack";
      t[name].slice().reverse().forEach(d => {
        const el = document.createElement("div");
        el.className = `hanoi-disk${state.selected === name && d === t[name][t[name].length - 1] ? " selected" : ""}`;
        el.style.setProperty("--disk-width", `${35 + (d / state.disks) * 53}%`);
        el.dataset.disk = d;
        const number = document.createElement("span");
        number.className = "hanoi-disk-number";
        number.textContent = d;
        el.append(number);
        stack.append(el);
      });
      tower.append(stack);

      const base = document.createElement("div");
      base.className = "hanoi-base";
      tower.append(base);

      const label = document.createElement("strong");
      label.textContent = `TORRE ${name}`;
      tower.append(label);

      const role = document.createElement("small");
      role.textContent = { A: "Origen", B: "Auxiliar", C: "Destino" }[name];
      tower.append(role);

      board.append(tower);
      tower.addEventListener("click", () => towerClick(name));
    });
    updateInfo();
    updateHistory();
  }

  function updateInfo() {
    const total = state.mode === "manual" ? state.total : state.moves.length;
    const current = state.mode === "manual" ? manualCount() : state.index;
    $("counter-label").textContent = state.mode === "manual" ? "MOVIMIENTOS REALIZADOS" : "MOVIMIENTO ACTUAL";
    $("counter").textContent = `${current} / ${total}`;
    $("previous").hidden = state.mode === "manual";
    $("next").hidden = state.mode === "manual";
    updateStartButton();

    const progressContainer = $("progress-container");
    const progressBar = $("progress-bar");
    if (progressContainer && progressBar) {
      if (state.mode === "automatic" && state.moves.length > 0) {
        progressContainer.hidden = false;
        const pct = Math.min(100, Math.max(0, Math.round((state.index / state.moves.length) * 100)));
        progressBar.style.width = `${pct}%`;
        progressContainer.setAttribute("aria-valuenow", String(pct));
      } else if (state.mode === "automatic") {
        progressContainer.hidden = false;
        progressBar.style.width = "0%";
        progressContainer.setAttribute("aria-valuenow", "0");
      } else {
        progressContainer.hidden = true;
      }
    }

    if (state.mode === "manual" && state.manual.C.length === state.disks) {
      $("message").textContent = manualCount() === state.total
        ? "Solución completada."
        : `Solución completada con ${manualCount() - state.total} movimientos adicionales.`;
    }
    updateFullscreenHud();
  }

  function manualCount() {
    return state.manual._count || 0;
  }

  function updateFullscreenHud() {
    const manual = state.mode === "manual";
    const current = manual ? manualCount() : state.index;
    const total = manual ? state.total : state.moves.length;
    const hasProgress = state.moves.length > 0 && state.index > 0 && state.index < state.moves.length;
    const playLabel = state.playing ? "⏸ Pausar" : hasProgress ? "▶ Continuar" : "▶ Reproducir";

    $("fullscreen-mode").textContent = manual ? "Libre" : "Guiado";
    $("fullscreen-disks").textContent = `${state.disks} ${state.disks === 1 ? "disco" : "discos"}`;
    $("fullscreen-counter").textContent = manual
      ? `Movimientos ${current} / óptimos ${total || 0}`
      : `Movimiento ${current} / ${total}`;
    $("fullscreen-status").textContent = $("message").textContent;
    $("fullscreen-play").textContent = playLabel;
    $("fullscreen-guided-controls").hidden = manual;
    $("fullscreen-manual-summary").hidden = !manual;
    $("fullscreen-manual-summary").textContent = `Movimientos realizados: ${current} · Óptimos: ${total || 0}`;

    const playDisabled = !state.connected || (state.animating && !state.playing);
    $("fullscreen-play").disabled = playDisabled;
    $("fullscreen-previous").disabled = state.animating || state.playing || !state.index;
    $("fullscreen-next").disabled = state.animating || state.playing || state.index >= state.moves.length;
    $("fullscreen-reset").disabled = state.animating;
    $("fullscreen-design-toggle").disabled = state.animating;
  }

  function lock(flag) {
    state.animating = flag;
    ["simulate", "reset", "fullscreen-open", "automatic-mode", "manual-mode", "disks", "disks-minus", "disks-plus", "speed", "design-toggle"].forEach(id => {
      const el = $(id);
      if (el) el.disabled = flag;
    });
    if ($("simulate")) $("simulate").disabled = !state.connected || (flag && !state.playing);
    if ($("previous")) $("previous").disabled = flag || state.playing || !state.index;
    if ($("next")) $("next").disabled = flag || state.playing || state.index >= state.moves.length;
    if ($("disks-minus")) $("disks-minus").disabled = flag || state.disks <= 1;
    if ($("disks-plus")) $("disks-plus").disabled = flag || state.disks >= 7;
    updateFullscreenHud();
  }

  async function animate(move, done) {
    const board = $("hanoi-board");
    const source = board.querySelector(`[data-tower="${move.origen}"] .hanoi-disk`);
    if (!source) {
      stop();
      $("message").textContent = "No se encontró el disco de origen.";
      updateFullscreenHud();
      return;
    }
    const destination = board.querySelector(`[data-tower="${move.destino}"] .hanoi-stack`);
    const r = source.getBoundingClientRect(), to = destination.getBoundingClientRect(), br = board.getBoundingClientRect();
    const clone = source.cloneNode(true), x0 = r.left - br.left - board.clientLeft, y0 = r.top - br.top - board.clientTop;
    const x = to.left - br.left - board.clientLeft + (to.width - r.width) / 2;
    const margin = parseFloat(getComputedStyle(source).marginBottom) || 0;
    const down = to.bottom - br.top - board.clientTop - margin - r.height - towers()[move.destino].length * (r.height + margin * 2);
    const lift = to.top - br.top - board.clientTop - r.height - 10;
    Object.assign(clone.style, { width: `${r.width}px`, height: `${r.height}px`, boxSizing: "border-box", left: `${x0}px`, top: `${y0}px` });
    clone.classList.add("hanoi-flying");
    board.append(clone);
    source.style.visibility = "hidden";
    lock(true);
    try {
      await clone.animate([
        { transform: "translate(0,0)" },
        { transform: `translate(0,${lift - y0}px)`, offset: 1/3 },
        { transform: `translate(${x - x0}px,${lift - y0}px)`, offset: 2/3 },
        { transform: `translate(${x - x0}px,${down - y0}px)` }
      ], { duration: speed() * 3, easing: "linear", fill: "forwards" }).finished;
      playHanoiLandingSound();
      done();
    } catch {
      stop();
      $("message").textContent = "Movimiento interrumpido.";
    } finally {
      clone.remove();
      source.style.visibility = "";
      lock(false);
    }
  }

  function speed() {
    return Math.max(120, Number($("speed").value) / 2);
  }

  async function autoStep(delta) {
    if (state.animating || !state.moves.length) return;
    const target = state.index + delta;
    if (target < 0 || target > state.moves.length) return;
    const original = state.moves[delta > 0 ? state.index : target];
    const move = delta > 0 ? original : { origen: original.destino, destino: original.origen };
    await animate(move, () => {
      state.index = target;
      render();
    });
  }

  async function play() {
    if (state.playing) {
      stop();
      $("message").textContent = "Pausado.";
      lock(state.animating);
      return;
    }
    if (state.animating || !state.moves.length) return;
    if (state.index === state.moves.length) reset();
    state.playing = true;
    updateStartButton();
    while (state.playing && state.index < state.moves.length) {
      await autoStep(1);
    }
    if (state.index >= state.moves.length && state.moves.length > 0) {
      $("message").textContent = "Solución completada.";
    }
    stop();
    lock(state.animating);
  }

  function towerClick(name) {
    if (state.mode !== "manual" || state.animating || !state.moves.length || state.manual.C.length === state.disks) return;
    if (!state.selected) {
      if (!state.manual[name].length) {
        $("message").textContent = "Esa torre está vacía.";
        updateFullscreenHud();
        return;
      }
      state.selected = name;
      $("message").textContent = `Torre ${name} seleccionada. Elige una torre destino.`;
      render();
      return;
    }
    if (state.selected === name) {
      state.selected = null;
      render();
      return;
    }
    const from = state.selected, disk = state.manual[from].at(-1), target = state.manual[name].at(-1);
    if (target !== undefined && target < disk) {
      $("message").textContent = "Movimiento inválido: no puedes colocar un disco mayor sobre uno menor.";
      state.selected = null;
      render();
      updateFullscreenHud();
      return;
    }
    const move = { origen: from, destino: name, numero: disk };
    state.selected = null;
    render();
    animate(move, () => {
      manualHistory.push({ ...move });
      state.manual[from].pop();
      state.manual[name].push(disk);
      state.manual._count = manualCount() + 1;
      render();
    });
  }

  async function load(mode) {
    const input = Number($("disks").value);
    if (!Number.isInteger(input) || input < 1 || input > 7) {
      $("message").textContent = "La cantidad de discos debe estar entre 1 y 7.";
      updateFullscreenHud();
      return false;
    }
    if (state.animating) return false;
    stop();
    lock(true);
    state.disks = input;
    state.mode = mode;
    state.index = 0;
    state.selected = null;
    $("simulate").disabled = true;
    try {
      const r = await fetch(`${BASE}/lab3/hanoi`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams({ discos: String(input) })
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || `Error HTTP ${r.status}`);
      state.moves = Array.isArray(data.movimientos) ? data.movimientos : [];
      state.total = Number(data.total ?? data.totalMovimientos ?? state.moves.length);
      resetManual();
      state.manual._count = 0;
      $("message").textContent = mode === "manual" ? "Modo Libre · Selecciona torre origen." : "Solución cargada desde Java. Iniciando recorrido...";
      render();
      return true;
    } catch (e) {
      $("message").textContent = `No se pudo cargar la solución: ${e.message}. Ejecuta Servidor.java.`;
      return false;
    } finally {
      lock(false);
    }
  }

  function updateStartButton() {
    if (state.mode === "manual") {
      $("simulate").textContent = "Iniciar partida";
      updateFullscreenHud();
      return;
    }
    if (state.playing) {
      $("simulate").textContent = "Ⅱ Pausar";
    } else if (state.moves.length && state.index > 0 && state.index < state.moves.length) {
      $("simulate").textContent = "Continuar solución";
    } else {
      $("simulate").textContent = "Iniciar solución";
    }
    updateFullscreenHud();
  }

  function stop() {
    state.playing = false;
    clearTimeout(state.timer);
    updateStartButton();
  }

  function reset() {
    if (state.animating) return;
    stop();
    state.selected = null;
    state.index = 0;
    resetManual();
    state.manual._count = 0;
    $("message").textContent = "Estado inicial · Discos en Torre A.";
    render();
    lock(state.animating);
  }

  async function check() {
    try {
      const r = await fetch(`${BASE}/lab3`);
      if (!r.ok) throw Error();
      state.connected = true;
      $("server-status").textContent = "● Servidor Java conectado";
      $("server-status").className = "server-status online";
      $("simulate").disabled = false;
      updateFullscreenHud();
    } catch {
      state.connected = false;
      $("server-status").textContent = "● Servidor Java desconectado";
      $("server-status").className = "server-status offline";
      $("simulate").disabled = true;
      $("message").textContent = "Ejecuta Servidor.java para habilitar la simulación.";
      updateFullscreenHud();
    }
  }

  function selectMode(mode) {
    if (state.animating) return;
    state.mode = mode;
    $("automatic-mode").classList.toggle("selected", mode === "automatic");
    $("manual-mode").classList.toggle("selected", mode === "manual");
    stop();
    state.index = 0;
    state.selected = null;
    resetManual();
    state.manual._count = 0;
    $("message").textContent = mode === "manual" ? "Modo Libre · Selecciona torre origen." : "Modo Guiado · Pulsa Iniciar para cargar la solución.";
    render();
    lock(state.animating);
  }

  const stylePicker = document.createElement("div");
  stylePicker.id = "design-popover";
  stylePicker.hidden = true;
  stylePicker.className = "hanoi-styles";
  stylePicker.setAttribute("role", "group");
  stylePicker.setAttribute("aria-label", "Estilo visual");

  const card = document.querySelector(".hanoi-card");
  card.addEventListener("pointerdown", unlockAudio, { capture: true });
  card.addEventListener("keydown", unlockAudio, { capture: true });
  function setStyle(style) {
    card.dataset.style = style;
    stylePicker.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.style === style)));
  }

  [["uni", "UNI"], ["escolar", "Escolar"], ["futurista", "Futurista"]].forEach(([value, title]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = title;
    b.dataset.style = value;
    b.addEventListener("click", () => {
      setStyle(value);
      closeDesign();
    });
    stylePicker.append(b);
  });
  const normalDesignControl = document.querySelector(".design-control");
  const fullscreenDesignControl = $("fullscreen-design-control");
  let activeDesignToggle = $("design-toggle");
  normalDesignControl.append(stylePicker);
  setStyle("uni");

  function closeDesign(focus = true) {
    stylePicker.hidden = true;
    $("design-toggle").setAttribute("aria-expanded", "false");
    $("fullscreen-design-toggle").setAttribute("aria-expanded", "false");
    if (focus && activeDesignToggle.offsetParent !== null) activeDesignToggle.focus();
  }

  function toggleDesign(toggle) {
    activeDesignToggle = toggle;
    const open = stylePicker.hidden;
    stylePicker.hidden = !open;
    $("design-toggle").setAttribute("aria-expanded", "false");
    $("fullscreen-design-toggle").setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-expanded", String(open));
    if (open) stylePicker.querySelector('[aria-pressed="true"]').focus();
  }

  $("design-toggle").addEventListener("click", () => toggleDesign($("design-toggle")));
  $("fullscreen-design-toggle").addEventListener("click", () => toggleDesign($("fullscreen-design-toggle")));
  $("sound-toggle").addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;
    $("sound-toggle").setAttribute("aria-pressed", String(state.soundEnabled));
    $("sound-toggle").textContent = state.soundEnabled ? "🔊 Sonido: Activado" : "🔇 Sonido: Desactivado";
    if (!state.soundEnabled) stopHanoiAudio();
  });

  document.addEventListener("click", e => {
    const clickedToggle = e.target === $("design-toggle") || e.target === $("fullscreen-design-toggle");
    if (!stylePicker.hidden && !stylePicker.contains(e.target) && !clickedToggle) closeDesign(false);
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !stylePicker.hidden) {
      closeDesign();
      e.preventDefault();
    }
  });

  const gamesMenu = $("games-menu");
  const gamesOpen = $("games-open");
  function closeGames(focus = false) {
    if (gamesMenu.hidden) return;
    gamesMenu.hidden = true;
    gamesOpen.setAttribute("aria-expanded", "false");
    if (focus) gamesOpen.focus();
  }
  $("games-open").addEventListener("click", () => {
    closeDesign(false);
    const open = gamesMenu.hidden;
    gamesMenu.hidden = !open;
    gamesOpen.setAttribute("aria-expanded", String(open));
    if (open) gamesMenu.querySelector("nav a").focus();
  });
  $("games-close").addEventListener("click", () => closeGames(true));
  document.addEventListener("click", event => {
    if (!gamesMenu.hidden && !document.querySelector(".games-menu-anchor").contains(event.target)) closeGames();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !gamesMenu.hidden) {
      closeGames(true);
      event.preventDefault();
    }
  });

  const historyPanel = $("history-panel");
  const historyBackdrop = $("history-backdrop");
  let activeHistoryToggle = $("history-toggle");

  function closeHistory(focus = true) {
    if (!historyPanel.hidden) {
      historyPanel.hidden = true;
      if (historyBackdrop) historyBackdrop.hidden = true;
      if ($("history-toggle")) $("history-toggle").setAttribute("aria-expanded", "false");
      if ($("fullscreen-history")) $("fullscreen-history").setAttribute("aria-expanded", "false");
      if (focus && activeHistoryToggle && activeHistoryToggle.offsetParent !== null) {
        activeHistoryToggle.focus();
      }
    }
  }

  function toggleHistory(toggle) {
    activeHistoryToggle = toggle;
    const open = historyPanel.hidden;
    historyPanel.hidden = !open;
    if (historyBackdrop) historyBackdrop.hidden = !open;
    if ($("history-toggle")) $("history-toggle").setAttribute("aria-expanded", "false");
    if ($("fullscreen-history")) $("fullscreen-history").setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-expanded", String(open));
    if (open) {
      $("history-close").focus();
      const currentTr = document.querySelector("#history-tbody .current-move");
      if (currentTr) currentTr.scrollIntoView({ block: "nearest" });
    }
  }

  if ($("history-toggle")) $("history-toggle").addEventListener("click", () => toggleHistory($("history-toggle")));
  if ($("fullscreen-history")) $("fullscreen-history").addEventListener("click", () => toggleHistory($("fullscreen-history")));
  if ($("history-close")) $("history-close").addEventListener("click", () => closeHistory());
  if (historyBackdrop) historyBackdrop.addEventListener("click", () => closeHistory());

  document.addEventListener("click", event => {
    const clickedToggle = event.target === $("history-toggle") ||
                          ($("history-toggle") && $("history-toggle").contains(event.target)) ||
                          event.target === $("fullscreen-history") ||
                          ($("fullscreen-history") && $("fullscreen-history").contains(event.target));
    if (!historyPanel.hidden && !historyPanel.contains(event.target) && !clickedToggle && event.target !== historyBackdrop) {
      closeHistory(false);
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !historyPanel.hidden) {
      closeHistory();
      event.preventDefault();
    }
  });

  $("automatic-mode").addEventListener("click", () => selectMode("automatic"));
  $("manual-mode").addEventListener("click", () => {
    selectMode("manual");
    load("manual");
  });

  async function startOrToggle() {
    if (state.mode === "manual") {
      await load("manual");
      return;
    }
    if (state.playing) {
      stop();
      $("message").textContent = "Pausado.";
      lock(state.animating);
      return;
    }
    const disksChanged = Number($("disks").value) !== state.disks;
    if (!state.moves.length || disksChanged) {
      const loaded = await load("automatic");
      if (!loaded) return;
    }
    await play();
  }

  $("simulate").addEventListener("click", startOrToggle);
  $("fullscreen-play").addEventListener("click", startOrToggle);

  $("disks-minus").addEventListener("click", () => setDisks(state.disks - 1));
  $("disks-plus").addEventListener("click", () => setDisks(state.disks + 1));
  $("disks").addEventListener("input", event => {
    const value = Number(event.target.value);
    if (Number.isInteger(value) && value >= 1 && value <= 7) setDisks(value);
  });
  $("disks").addEventListener("change", event => setDisks(event.target.value));
  $("reset").addEventListener("click", reset);
  $("previous").addEventListener("click", () => autoStep(-1));
  $("next").addEventListener("click", () => autoStep(1));
  $("fullscreen-reset").addEventListener("click", reset);
  $("fullscreen-previous").addEventListener("click", () => autoStep(-1));
  $("fullscreen-next").addEventListener("click", () => autoStep(1));
  window.addEventListener("pagehide", stopHanoiAudio);

  function getExecutedMoves() {
    if (state.mode === "manual") {
      return manualHistory;
    }
    const t = {
      A: Array.from({ length: state.disks }, (_, i) => state.disks - i),
      B: [],
      C: []
    };
    const executed = [];
    for (let i = 0; i < state.index; i++) {
      const m = state.moves[i];
      if (m) {
        const disk = (t[m.origen] && t[m.origen].length > 0) ? t[m.origen].pop() : 1;
        if (t[m.destino]) t[m.destino].push(disk);
        executed.push({
          numero: disk,
          origen: m.origen,
          destino: m.destino
        });
      }
    }
    return executed;
  }

  function updateHistory() {
    const moves = getExecutedMoves();
    const emptyMsg = $("history-empty");
    const tableContainer = $("history-table-container");
    const tbody = $("history-tbody");
    const summary = $("history-summary");
    const summaryTitle = $("history-summary-title");
    const completionEl = $("history-completion");

    // Modo Libre: sección TUS MOVIMIENTOS y estadísticas
    if (summary) {
      if (state.mode === "manual") {
        summary.hidden = false;
        if (summaryTitle) summaryTitle.textContent = "TUS MOVIMIENTOS";
        const count = manualCount();
        const optimal = state.total || (Math.pow(2, state.disks) - 1);
        if ($("hist-realizados")) $("hist-realizados").textContent = String(count);
        if ($("hist-optimo")) $("hist-optimo").textContent = String(optimal);

        if (completionEl) {
          if (state.manual.C.length === state.disks && count > 0) {
            completionEl.hidden = false;
            if (count === optimal) {
              completionEl.textContent = "✓ Solución óptima";
              completionEl.className = "history-completion optimal";
            } else {
              const diff = count - optimal;
              completionEl.textContent = `+${diff} movimiento${diff === 1 ? "" : "s"} adicional${diff === 1 ? "" : "es"}`;
              completionEl.className = "history-completion additional";
            }
          } else {
            completionEl.hidden = true;
          }
        }
      } else {
        summary.hidden = true;
      }
    }

    // Estado vacío si no hay movimientos ejecutados
    if (!moves.length) {
      if (emptyMsg) {
        emptyMsg.hidden = false;
        emptyMsg.textContent = "No hay movimientos registrados todavía.";
      }
      if (tableContainer) tableContainer.hidden = true;
      if (tbody) tbody.replaceChildren();
      return;
    }

    if (emptyMsg) emptyMsg.hidden = true;
    if (tableContainer) tableContainer.hidden = false;

    if (tbody) {
      tbody.replaceChildren();
      moves.forEach((m, idx) => {
        const tr = document.createElement("tr");
        const isCurrent = idx === moves.length - 1;
        if (isCurrent) tr.classList.add("current-move");

        const tdNum = document.createElement("td");
        tdNum.className = "col-num";
        tdNum.textContent = String(idx + 1);

        const tdDisk = document.createElement("td");
        tdDisk.className = "col-disk";
        tdDisk.textContent = `Disco ${m.numero}`;

        const tdOrigin = document.createElement("td");
        tdOrigin.className = "col-origin";
        tdOrigin.textContent = m.origen;

        const tdDest = document.createElement("td");
        tdDest.className = "col-dest";
        tdDest.textContent = m.destino;

        tr.append(tdNum, tdDisk, tdOrigin, tdDest);
        tbody.append(tr);
      });

      // Auto-scroll al movimiento actual si el panel está abierto
      if (!historyPanel.hidden && tableContainer) {
        const currentTr = tbody.querySelector(".current-move");
        if (currentTr) {
          currentTr.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }
    }
  }

  const stage = card;
  function syncFullscreen() {
    const full = document.fullscreenElement === stage || stage.classList.contains("fullscreen-fallback");
    closeDesign(false);
    if (full) {
      fullscreenDesignControl.append(stylePicker);
      activeDesignToggle = $("fullscreen-design-toggle");
    } else {
      normalDesignControl.append(stylePicker);
      activeDesignToggle = $("design-toggle");
      closeHistory(false);
    }
    $("fullscreen-hud").hidden = !full;
    $("fullscreen-exit").hidden = !full;
    $("fullscreen-open").setAttribute("aria-expanded", String(full));
    updateFullscreenHud();
    if (!full) $("fullscreen-open").focus();
  }
  $("fullscreen-open").addEventListener("click", async () => {
    if (state.animating) return;
    stop();
    lock(false);
    closeDesign(false);
    try {
      if (!stage.requestFullscreen) throw new Error("Fullscreen no disponible");
      await stage.requestFullscreen();
    } catch {
      stage.classList.add("fullscreen-fallback");
    }
    syncFullscreen();
    $("fullscreen-exit-top").focus();
  });
  async function exitFullscreen() {
    if (document.fullscreenElement === stage) await document.exitFullscreen();
    stage.classList.remove("fullscreen-fallback");
    syncFullscreen();
  }
  $("fullscreen-exit").addEventListener("click", exitFullscreen);
  $("fullscreen-exit-top").addEventListener("click", exitFullscreen);
  document.addEventListener("fullscreenchange", syncFullscreen);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && (document.fullscreenElement === stage || stage.classList.contains("fullscreen-fallback"))) {
      closeHistory(false);
      closeDesign(false);
      exitFullscreen();
    }
  });

  theme();
  resetManual();
  render();
  check();
})();
