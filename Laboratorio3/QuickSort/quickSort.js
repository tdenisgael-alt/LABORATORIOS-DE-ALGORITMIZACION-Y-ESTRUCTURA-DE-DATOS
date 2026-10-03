(() => {
  const BASE = "http://localhost:8080";
  const elements = {
    card: document.querySelector(".quick-card"),
    board: document.getElementById("tree-board"),
    treeCanvas: document.getElementById("tree-canvas"),
    treeZoomOut: document.getElementById("tree-zoom-out"),
    treeZoomIn: document.getElementById("tree-zoom-in"),
    treeZoomLabel: document.getElementById("tree-zoom-label"),
    treeFit: document.getElementById("tree-fit"),
    partitionBoard: document.getElementById("partition-board"),
    partitionArray: document.getElementById("partition-array"),
    partitionTitle: document.getElementById("partition-title"),
    partitionRange: document.getElementById("partition-range"),
    partitionStatus: document.getElementById("partition-status"),
    input: document.getElementById("array"),
    speed: document.getElementById("speed"),
    design: document.getElementById("design"),
    counter: document.getElementById("counter"),
    progress: document.getElementById("progress"),
    stepLabel: document.getElementById("step-label"),
    initialArray: document.getElementById("initial-array"),
    finalArray: document.getElementById("final-array"),
    message: document.getElementById("message"),
    server: document.getElementById("server-status"),
    start: document.getElementById("start"),
    pause: document.getElementById("pause"),
    previous: document.getElementById("previous"),
    next: document.getElementById("next"),
    reset: document.getElementById("reset"),
    soundToggle: document.getElementById("sound-toggle"),
    theme: document.getElementById("btnThemeToggle"),
    gamesOpen: document.getElementById("games-open"),
    gamesMenu: document.getElementById("games-menu"),
    gamesClose: document.getElementById("games-close"),
    designToggle: document.getElementById("design-toggle"),
    designPopover: document.getElementById("design-popover"),
    fullscreenDesignToggle: document.getElementById("fullscreen-design-toggle"),
    fullscreenDesignControl: document.getElementById("fullscreen-design-control"),
    fullscreenHud: document.getElementById("fullscreen-hud"),
    fullscreenOpen: document.getElementById("fullscreen-open"),
    fullscreenExit: document.getElementById("fullscreen-exit"),
    fullscreenExitTop: document.getElementById("fullscreen-exit-top"),
    fullscreenState: document.getElementById("fullscreen-state"),
    fullscreenCounter: document.getElementById("fullscreen-counter"),
    fullscreenStatus: document.getElementById("fullscreen-status"),
    fullscreenPrevious: document.getElementById("fullscreen-previous"),
    fullscreenPlay: document.getElementById("fullscreen-play"),
    fullscreenNext: document.getElementById("fullscreen-next"),
    fullscreenReset: document.getElementById("fullscreen-reset"),
    fullscreenHistory: document.getElementById("fullscreen-history"),
    historyToggle: document.getElementById("history-toggle"),
    historyPanel: document.getElementById("history-panel"),
    historyClose: document.getElementById("history-close"),
    historyBackdrop: document.getElementById("history-backdrop"),
    historySummary: document.getElementById("history-summary"),
    historyBody: document.getElementById("history-body"),
    historyEmpty: document.getElementById("history-empty")
  };
  const designHome = elements.designPopover.parentElement;
  const state = { states: [], contexts: [], index: 0, playing: false, animating: false, loading: false, playbackId: 0, connected: false, inputValue: "", treeZoom: 1, fitTree: false, layoutFrame: 0, soundEnabled: true };

  let audioUnlocked = false;
  const swapAudio = {
    near: new Audio("../assets/audio/quicksort_cerca.mp3"),
    far: new Audio("../assets/audio/quicksort largo.mp3")
  };
  swapAudio.near.volume = 0.28;
  swapAudio.far.volume = 0.30;

  function primeAudio(audio) {
    const volume = audio.volume;
    audio.volume = 0;
    const started = audio.play();
    if (!started) { audio.volume = volume; return; }
    started.then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = volume;
    }).catch(() => { audio.volume = volume; });
  }

  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    Object.values(swapAudio).forEach(primeAudio);
  }

  function stopSwapAudio() {
    Object.values(swapAudio).forEach(audio => { audio.pause(); audio.currentTime = 0; });
  }

  function playSwapSound(changed) {
    if (!state.soundEnabled || !audioUnlocked || changed.length < 2) return;
    const distance = Math.max(...changed) - Math.min(...changed);
    stopSwapAudio();
    (distance <= 2 ? swapAudio.near : swapAudio.far).play().catch(() => {});
  }

  function setTheme() {
    const dark = document.documentElement.classList.contains("dark-mode");
    document.body.classList.toggle("dark-mode", dark);
    elements.theme.textContent = dark ? "☀️ Modo Claro" : "🌙 Modo Oscuro";
  }

  function updateHistory() {
    elements.historyBody.replaceChildren();
    state.states.slice(1, state.index + 1).forEach((values, index) => {
      const row = document.createElement("tr");
      if (index === state.index - 1) row.className = "current-move";
      [index + 1, movementLabel(index + 1), formatArray(values)].forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      elements.historyBody.append(row);
    });
    elements.historyEmpty.hidden = state.index > 0;
    elements.historySummary.textContent = `Cambios realizados: ${state.index} / ${totalSteps()}`;
  }

  function syncFullscreen() {
    elements.fullscreenState.textContent = elements.stepLabel.textContent;
    elements.fullscreenCounter.textContent = `Cambio ${state.index} / ${totalSteps()}`;
    elements.fullscreenStatus.textContent = elements.message.textContent;
    elements.fullscreenPrevious.disabled = elements.previous.disabled;
    elements.fullscreenNext.disabled = elements.next.disabled;
    elements.fullscreenPlay.disabled = elements.start.disabled;
    elements.fullscreenReset.disabled = elements.reset.disabled;
    elements.fullscreenPlay.textContent = state.playing ? "Ⅱ Pausar" : state.index > 0 && state.index < totalSteps() ? "▶ Continuar" : "▶ Iniciar";
  }

  function setHistory(open) {
    elements.historyPanel.hidden = !open;
    elements.historyBackdrop.hidden = !open;
    elements.historyToggle.setAttribute("aria-expanded", String(open));
    elements.fullscreenHistory.setAttribute("aria-expanded", String(open));
  }

  function setGames(open) {
    elements.gamesMenu.hidden = !open;
    elements.gamesOpen.setAttribute("aria-expanded", String(open));
  }

  function setDesignPopover(open, toggle = elements.designToggle) {
    if (open) (toggle === elements.fullscreenDesignToggle ? elements.fullscreenDesignControl : designHome).append(elements.designPopover);
    else designHome.append(elements.designPopover);
    elements.designPopover.hidden = !open;
    elements.designToggle.setAttribute("aria-expanded", String(open && toggle === elements.designToggle));
    elements.fullscreenDesignToggle.setAttribute("aria-expanded", String(open && toggle === elements.fullscreenDesignToggle));
  }

  function setFullscreen(active) {
    elements.card.classList.toggle("fullscreen-fallback", active && !document.fullscreenElement);
    elements.fullscreenHud.hidden = !active;
    elements.fullscreenExit.hidden = !active;
    if (!active) { setHistory(false); setDesignPopover(false); }
  }

  async function enterFullscreen() {
    if (document.fullscreenElement === elements.card) return;
    if (elements.card.requestFullscreen) {
      try { await elements.card.requestFullscreen(); } catch { elements.card.classList.add("fullscreen-fallback"); setFullscreen(true); }
    } else { elements.card.classList.add("fullscreen-fallback"); setFullscreen(true); }
  }

  async function exitFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    elements.card.classList.remove("fullscreen-fallback");
    setFullscreen(false);
  }

  function formatArray(values) {
    return values?.length ? values.join(", ") : "--";
  }

  function totalSteps() {
    return Math.max(0, state.states.length - 1);
  }

  function equalArrays(first, second) {
    return first.length === second.length && first.every((value, index) => value === second[index]);
  }

  function changedIndices(from, to) {
    return from.reduce((indices, value, index) => {
      if (value !== to[index]) indices.push(index);
      return indices;
    }, []);
  }

  // Solo vincula los estados existentes con su pivote; no calcula particiones.
  function mapContexts(states, trace) {
    const contexts = [];
    let cursor = 0;
    for (const call of trace) {
      if (equalArrays(call.subarregloAntes, call.subarregloDespues)) continue;
      if (!states[cursor] || !equalArrays(states[cursor].slice(call.inicio, call.fin + 1), call.subarregloAntes)) continue;
      const end = states.findIndex((values, index) => index > cursor &&
        equalArrays(values.slice(call.inicio, call.fin + 1), call.subarregloDespues));
      if (end < 0) continue;
      let pivotPosition = call.fin;
      for (let index = cursor + 1; index <= end; index += 1) {
        const changed = changedIndices(states[index - 1], states[index]);
        const pivotBefore = pivotPosition;
        if (changed.length === 2 && changed.includes(pivotPosition)) {
          pivotPosition = changed.find(position => position !== pivotPosition);
        }
        contexts[index] = { pivotBefore, pivotAfter: pivotPosition, pivot: call.pivote };
      }
      cursor = end;
    }
    return contexts;
  }

  function movementLabel(index) {
    const before = state.states[index - 1];
    const after = state.states[index];
    if (!before || !after) return "Arreglo inicial";
    const changed = changedIndices(before, after);
    if (changed.length === 2) {
      return `Intercambio ${before[changed[0]]} ↔ ${before[changed[1]]} · posiciones ${changed[0] + 1} y ${changed[1] + 1}`;
    }
    return `Cambio en posiciones ${changed.map(position => position + 1).join(", ")}`;
  }

  function createPartitionCell(value, index, moved = false, pivot = false) {
    const cell = document.createElement("span");
    cell.className = `partition-cell${pivot ? " pivot-cell" : ""}${moved ? " compared-cell moved-cell" : ""}`;
    cell.textContent = value;
    cell.dataset.index = String(index);
    return cell;
  }

  function renderArray(values, changed = [], pivot = -1) {
    elements.partitionArray.replaceChildren();
    const row = document.createElement("div");
    row.className = "partition-row";
    values.forEach((value, index) => row.append(createPartitionCell(value, index, changed.includes(index), index === pivot)));
    elements.partitionArray.append(row);
    return row;
  }

  function renderPartition() {
    if (!state.states.length) {
      elements.partitionArray.innerHTML = '<p class="partition-empty">Aquí verás el arreglo completo y cada intercambio.</p>';
      elements.partitionTitle.textContent = "Esperando solución";
      elements.partitionRange.textContent = "Sin movimientos";
      elements.partitionStatus.textContent = "Inicia para ver los movimientos.";
      return;
    }
    const values = state.states[state.index];
    const changed = state.index ? changedIndices(state.states[state.index - 1], values) : [];
    const context = state.contexts[state.index || 1];
    const pivot = context ? (state.index ? context.pivotAfter : context.pivotBefore) : -1;
    renderArray(values, changed, pivot);
    elements.partitionTitle.textContent = state.index === totalSteps() ? "Arreglo ordenado" : state.index ? "Arreglo actual" : "Arreglo inicial";
    elements.partitionRange.textContent = `${values.length} elementos${context ? ` · pivote ${context.pivot}` : ""}`;
    elements.partitionStatus.textContent = state.index ? movementLabel(state.index) : totalSteps() ? "Listo para comenzar los intercambios." : "El arreglo ya está ordenado; no hay cambios.";
  }

  async function nextPaint() {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  async function animateArray(target) {
    const from = state.states[state.index];
    const to = state.states[target];
    const changed = changedIndices(from, to);
    const forward = target > state.index;
    const step = Math.max(target, state.index);
    const context = state.contexts[step];
    const pivot = context ? (forward ? context.pivotBefore : context.pivotAfter) : -1;
    const row = renderArray(from, changed, pivot);
    elements.partitionTitle.textContent = forward ? "Intercambio en curso" : "Deshaciendo intercambio";
    elements.partitionRange.textContent = `${from.length} elementos${context ? ` · pivote ${context.pivot}` : ""}`;
    elements.partitionStatus.textContent = movementLabel(step);
    elements.partitionBoard.classList.add("is-animating");
    await nextPaint();

    // Los destinos se obtienen del siguiente estado de Java. Se preservan
    // las casillas sin cambios, incluso cuando hay números repetidos.
    const remaining = new Set(changed);
    const positions = [...row.children].map(cell => cell.getBoundingClientRect());
    const duration = Math.max(250, Number(elements.speed.value) || 600);
    const animations = [];
    try {
      playSwapSound(changed);
      changed.forEach((index, order) => {
        const targetIndex = [...remaining].find(position => to[position] === from[index]);
        if (targetIndex === undefined) return;
        remaining.delete(targetIndex);
        const cell = row.children[index];
        const deltaX = positions[targetIndex].left - positions[index].left;
        const arc = (order % 2 ? 1 : -1) * 28;
        cell.style.zIndex = "3";
        animations.push(cell.animate([
          { transform: "translate(0, 0)" },
          { transform: `translate(${deltaX * 0.5}px, ${arc}px)`, offset: 0.5 },
          { transform: `translate(${deltaX}px, 0)` }
        ], { duration, easing: "cubic-bezier(.35,.05,.2,1)", fill: "forwards" }));
      });
      await Promise.allSettled(animations.map(animation => animation.finished));
    } finally {
      animations.forEach(animation => animation.cancel());
      elements.partitionBoard.classList.remove("is-animating");
    }
  }

  function createChangeRow(index) {
    const values = state.states[index];
    const changed = changedIndices(state.states[index - 1], values);
    const node = document.createElement("article");
    node.className = `tree-node change-row${index === state.index ? " active-node" : " completed-node"}`;
    node.dataset.changeIndex = String(index);
    if (index === state.index) node.setAttribute("aria-current", "step");
    const label = document.createElement("strong");
    label.className = "change-label";
    label.textContent = `#${index}`;
    const numbers = document.createElement("div");
    numbers.className = "number-row";
    values.forEach((value, position) => {
      const cell = document.createElement("span");
      cell.className = `tree-number${changed.includes(position) ? " changed-number" : ""}`;
      cell.textContent = value;
      numbers.append(cell);
    });
    node.title = movementLabel(index);
    node.append(label, numbers);
    return node;
  }

  function applyTreeZoom(center = false) {
    elements.treeCanvas.style.zoom = String(state.treeZoom);
    elements.treeZoomLabel.textContent = `${Math.round(state.treeZoom * 100)}%`;
    elements.treeZoomOut.disabled = state.treeZoom <= 0.36;
    elements.treeZoomIn.disabled = state.treeZoom >= 1.6;
    elements.treeFit.classList.toggle("active", state.fitTree);
    if (center) requestAnimationFrame(() => { elements.board.scrollLeft = Math.max(0, (elements.board.scrollWidth - elements.board.clientWidth) / 2); elements.board.scrollTop = 0; });
  }

  function fitTreeToViewport() {
    if (!elements.treeCanvas.firstElementChild) return;
    elements.treeCanvas.style.zoom = "1";
    const naturalWidth = Math.max(elements.treeCanvas.scrollWidth, elements.treeCanvas.offsetWidth);
    const naturalHeight = Math.max(elements.treeCanvas.scrollHeight, elements.treeCanvas.offsetHeight);
    const availableWidth = Math.max(160, elements.board.clientWidth - 36);
    const availableHeight = Math.max(180, elements.board.clientHeight - 36);
    state.treeZoom = Math.max(0.36, Math.min(1.2, availableWidth / naturalWidth, availableHeight / naturalHeight));
    state.fitTree = true;
    applyTreeZoom(true);
  }

  function scheduleTreeLayout() {
    cancelAnimationFrame(state.layoutFrame);
    state.layoutFrame = requestAnimationFrame(() => state.fitTree ? fitTreeToViewport() : applyTreeZoom());
  }

  function setTreeZoom(value) {
    state.fitTree = false;
    state.treeZoom = Math.max(0.36, Math.min(1.6, value));
    applyTreeZoom(true);
  }

  function renderChanges() {
    elements.treeCanvas.replaceChildren();
    if (!state.index) {
      elements.treeCanvas.innerHTML = '<div class="tree-empty">Los cambios aparecerán aquí después de cada movimiento.</div>';
    } else {
      const sequence = document.createElement("div");
      sequence.className = "change-sequence";
      for (let index = 1; index <= state.index; index += 1) sequence.append(createChangeRow(index));
      elements.treeCanvas.append(sequence);
    }
    scheduleTreeLayout();
  }

  function updateControls() {
    const busy = state.animating || state.loading;
    elements.previous.disabled = busy || state.playing || state.index === 0;
    elements.next.disabled = busy || state.playing || state.index >= totalSteps();
    elements.pause.disabled = !state.playing;
    elements.reset.disabled = busy || !state.states.length;
    elements.start.disabled = state.loading || !state.connected || (state.animating && !state.playing);
    elements.start.textContent = state.playing ? "Ⅱ Pausar" : state.index > 0 && state.index < totalSteps() ? "▶ Continuar" : "▶ Iniciar ordenamiento";
    syncFullscreen();
  }

  function render() {
    renderPartition();
    renderChanges();
    const total = totalSteps();
    elements.counter.textContent = `Cambio ${state.index} / ${total}`;
    elements.progress.style.width = `${total ? (state.index / total) * 100 : state.states.length ? 100 : 0}%`;
    elements.stepLabel.textContent = state.index ? `Movimiento ${state.index} de ${total}` : "Arreglo completo";
    elements.initialArray.textContent = formatArray(state.states[0]);
    elements.finalArray.textContent = state.states.length && state.index === total ? formatArray(state.states[state.index]) : "Pendiente";
    elements.message.textContent = state.loading ? "Cargando movimientos..." : state.states.length
      ? state.index === total ? total ? "Ordenamiento completado." : "El arreglo ya está ordenado; no necesita cambios."
        : state.index ? movementLabel(state.index) : "Arreglo completo listo para iniciar."
      : "Ingresa un arreglo y comienza.";
    updateHistory();
    updateControls();
  }

  function followCurrentChange() {
    if (state.fitTree) return;
    const current = elements.treeCanvas.querySelector('[aria-current="step"]');
    if (!current) return;
    const row = current.getBoundingClientRect();
    const board = elements.board.getBoundingClientRect();
    if (row.bottom > board.bottom - 18) elements.board.scrollTop += row.bottom - board.bottom + 18;
    else if (row.top < board.top + 18) elements.board.scrollTop += row.top - board.top - 18;
  }

  async function animateStep(target) {
    if (state.loading || state.animating || target < 0 || target > totalSteps() || Math.abs(target - state.index) !== 1) return;
    const forward = target > state.index;
    state.animating = true;
    updateControls();
    let failure = null;
    try {
      await animateArray(target);
      state.index = target;
      render();
      await nextPaint();
      followCurrentChange();
      const current = elements.treeCanvas.querySelector('[aria-current="step"]');
      if (forward && current) {
        await current.animate([
          { opacity: 0.3, transform: "translateY(8px)" },
          { opacity: 1, transform: "translateY(0)" }
        ], { duration: 160, easing: "ease-out" }).finished.catch(() => {});
      }
    } catch (error) {
      stopPlayback();
      failure = error;
    } finally {
      state.animating = false;
      render();
      if (failure) {
        elements.message.textContent = `No se pudo mostrar el movimiento: ${failure.message}`;
        syncFullscreen();
      }
    }
  }

  function stopPlayback() {
    state.playing = false;
    state.playbackId += 1;
  }

  async function loadSolution() {
    if (state.loading || state.animating) return false;
    const raw = elements.input.value.trim();
    if (!raw) {
      elements.message.textContent = "Ingresa al menos un número entero.";
      return false;
    }
    stopPlayback();
    state.loading = true;
    render();
    let errorMessage = "";
    try {
      const response = await fetch(`${BASE}/lab3/quicksort`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" }, body: new URLSearchParams({ arreglo: raw }) });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.estados) || !result.estados.length ||
        !result.estados.every(values => Array.isArray(values) && values.length === result.estados[0].length)) {
        throw new Error(result.error || "La respuesta no contiene los estados del arreglo.");
      }
      // Conserva exclusivamente los cambios reales ya producidos por Java.
      state.states = result.estados.filter((values, index, all) => !index || !equalArrays(values, all[index - 1]));
      state.contexts = mapContexts(state.states, Array.isArray(result.traza) ? result.traza : []);
      state.index = 0;
      state.inputValue = raw;
      state.treeZoom = 1;
      state.fitTree = false;
      return true;
    } catch (error) {
      errorMessage = `No se pudo cargar Quick Sort: ${error.message}`;
      return false;
    } finally {
      state.loading = false;
      render();
      if (errorMessage) {
        elements.message.textContent = errorMessage;
        syncFullscreen();
      }
    }
  }

  async function play() {
    if (state.playing) {
      stopPlayback();
      updateControls();
      return;
    }
    if (state.loading || state.animating || !totalSteps()) return;
    if (state.index === totalSteps()) state.index = 0;
    const playbackId = ++state.playbackId;
    state.playing = true;
    render();
    while (state.playing && playbackId === state.playbackId && state.index < totalSteps()) {
      await animateStep(state.index + 1);
      if (!state.playing || playbackId !== state.playbackId) return;
      if (state.index < totalSteps()) await new Promise(resolve => setTimeout(resolve, 220));
    }
    if (playbackId !== state.playbackId) return;
    state.playing = false;
    render();
  }

  function reset() {
    if (state.loading || state.animating) return;
    stopPlayback();
    state.index = 0;
    elements.board.scrollTop = 0;
    render();
  }

  elements.theme.addEventListener("click", () => { document.documentElement.classList.toggle("dark-mode"); localStorage.setItem("theme", document.documentElement.classList.contains("dark-mode") ? "dark" : "light"); setTheme(); });
  elements.card.addEventListener("pointerdown", unlockAudio, { capture: true });
  elements.card.addEventListener("keydown", unlockAudio, { capture: true });
  elements.soundToggle.addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;
    elements.soundToggle.setAttribute("aria-pressed", String(state.soundEnabled));
    elements.soundToggle.textContent = state.soundEnabled ? "🔊 Sonido: Activado" : "🔇 Sonido: Desactivado";
    if (!state.soundEnabled) stopSwapAudio();
  });
  elements.design.addEventListener("change", event => { elements.card.dataset.style = event.target.value; setDesignPopover(false); scheduleTreeLayout(); });
  elements.designToggle.addEventListener("click", () => setDesignPopover(elements.designPopover.hidden));
  elements.fullscreenDesignToggle.addEventListener("click", () => setDesignPopover(elements.designPopover.hidden, elements.fullscreenDesignToggle));
  elements.designPopover.querySelectorAll("[data-style]").forEach(button => button.addEventListener("click", () => { elements.design.value = button.dataset.style; elements.design.dispatchEvent(new Event("change")); }));
  elements.gamesOpen.addEventListener("click", () => setGames(elements.gamesMenu.hidden));
  elements.gamesClose.addEventListener("click", () => setGames(false));
  elements.historyToggle.addEventListener("click", () => setHistory(elements.historyPanel.hidden));
  elements.fullscreenHistory.addEventListener("click", () => setHistory(elements.historyPanel.hidden));
  elements.historyClose.addEventListener("click", () => setHistory(false));
  elements.historyBackdrop.addEventListener("click", () => setHistory(false));
  elements.fullscreenOpen.addEventListener("click", enterFullscreen);
  elements.fullscreenExit.addEventListener("click", exitFullscreen);
  elements.fullscreenExitTop.addEventListener("click", exitFullscreen);
  elements.fullscreenPrevious.addEventListener("click", () => animateStep(state.index - 1));
  elements.fullscreenNext.addEventListener("click", () => animateStep(state.index + 1));
  elements.fullscreenPlay.addEventListener("click", () => elements.start.click());
  elements.fullscreenReset.addEventListener("click", reset);
  document.addEventListener("fullscreenchange", () => { setFullscreen(document.fullscreenElement === elements.card); scheduleTreeLayout(); });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (!elements.historyPanel.hidden) { setHistory(false); return; }
    if (!elements.designPopover.hidden) { setDesignPopover(false); return; }
    if (!elements.gamesMenu.hidden) { setGames(false); return; }
    if (document.fullscreenElement === elements.card || elements.card.classList.contains("fullscreen-fallback")) exitFullscreen();
  });
  elements.start.addEventListener("click", async () => { if (state.playing) { play(); return; } if (!state.states.length || elements.input.value.trim() !== state.inputValue) { if (!await loadSolution()) return; } play(); });
  elements.pause.addEventListener("click", () => play());
  elements.previous.addEventListener("click", () => animateStep(state.index - 1));
  elements.next.addEventListener("click", () => animateStep(state.index + 1));
  elements.reset.addEventListener("click", reset);
  elements.treeZoomOut.addEventListener("click", () => setTreeZoom(state.treeZoom - 0.1));
  elements.treeZoomIn.addEventListener("click", () => setTreeZoom(state.treeZoom + 0.1));
  elements.treeFit.addEventListener("click", fitTreeToViewport);
  elements.speed.addEventListener("change", () => { if (!state.animating) elements.message.textContent = `Velocidad: ${elements.speed.options[elements.speed.selectedIndex].text}.`; });
  window.addEventListener("pagehide", stopSwapAudio);
  let pan = null;
  elements.board.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    pan = { x: event.clientX, y: event.clientY, left: elements.board.scrollLeft, top: elements.board.scrollTop };
    elements.board.classList.add("is-panning");
    elements.board.setPointerCapture(event.pointerId);
  });
  elements.board.addEventListener("pointermove", event => {
    if (!pan) return;
    elements.board.scrollLeft = pan.left - (event.clientX - pan.x);
    elements.board.scrollTop = pan.top - (event.clientY - pan.y);
  });
  const stopPan = event => {
    if (!pan) return;
    pan = null;
    elements.board.classList.remove("is-panning");
    if (elements.board.hasPointerCapture(event.pointerId)) elements.board.releasePointerCapture(event.pointerId);
  };
  elements.board.addEventListener("pointerup", stopPan);
  elements.board.addEventListener("pointercancel", stopPan);
  new ResizeObserver(() => { if (state.fitTree) scheduleTreeLayout(); }).observe(elements.board);
  fetch(`${BASE}/lab3`).then(response => { if (!response.ok) throw new Error(); state.connected = true; elements.server.textContent = "● Servidor Java conectado"; elements.server.className = "server-status online"; render(); }).catch(() => { elements.server.textContent = "● Servidor Java desconectado"; elements.server.className = "server-status offline"; });
  setTheme();
  elements.card.dataset.style = elements.design.value;
  render();
})();
