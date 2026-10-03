(() => {
  const BASE = window.API_BASE;
  const totalQueens = 8;
  const queenMoveDuration = 920;
  const queenStepDelay = 165;
  const initialPosition = { reina: 1, columna: 0, fila: 0 };
  const elements = {
    card: document.querySelector(".queens-card"),
    board: document.getElementById("chess-board"),
    counter: document.getElementById("counter"),
    coordinates: document.getElementById("coordinates"),
    message: document.getElementById("message"),
    progress: document.getElementById("progress"),
    stateLabel: document.getElementById("state-label"),
    server: document.getElementById("server-status"),
    design: document.getElementById("design"),
    solutionControl: document.getElementById("solution-control"),
    solutionButtons: [...document.querySelectorAll("[data-solution]")],
    solutionIndicator: document.getElementById("solution-indicator"),
    guidedActions: document.getElementById("guided-actions"),
    guidedMode: document.getElementById("guided-mode"),
    freeMode: document.getElementById("free-mode"),
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
    fullscreenMode: document.getElementById("fullscreen-mode"),
    fullscreenSolution: document.getElementById("fullscreen-solution"),
    fullscreenCounter: document.getElementById("fullscreen-counter"),
    fullscreenStatus: document.getElementById("fullscreen-status"),
    fullscreenSolutionPicker: document.getElementById("fullscreen-solution-picker"),
    fullscreenSolutionButtons: [...document.querySelectorAll("[data-fullscreen-solution]")],
    fullscreenGuidedControls: document.getElementById("fullscreen-guided-controls"),
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
  const state = { mode: "guided", solutions: [], solutionIndex: 0, positions: [], index: 0, manualPositions: [], conflicts: [], playing: false, animating: false, switching: false, timer: null, timerResolve: null, connected: false, conflictTimer: null, soundEnabled: true };

  let audioUnlocked = false;
  const queenAudio = {
    wood: new Audio("../assets/audio/8 reinas madera.mp3"),
    future: new Audio("../assets/audio/8 reinas_futuro.mp3")
  };
  queenAudio.wood.volume = 0.45;
  queenAudio.future.volume = 0.42;
  Object.values(queenAudio).forEach(audio => {
    audio.preload = "auto";
    audio.load();
  });

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
    Object.values(queenAudio).forEach(primeAudio);
  }

  function stopQueenAudio() {
    Object.values(queenAudio).forEach(audio => { audio.pause(); audio.currentTime = 0; });
  }

  function playQueenLandingSound() {
    if (!state.soundEnabled || !audioUnlocked) return;
    stopQueenAudio();
    const audio = elements.card.dataset.style === "futurista" ? queenAudio.future : queenAudio.wood;
    audio.play().catch(() => {});
  }

  function scheduleQueenLandingSound(duration) {
    const lead = elements.card.dataset.style === "futurista" ? 260 : 150;
    return window.setTimeout(playQueenLandingSound, Math.max(0, duration - lead));
  }

  function setTheme() {
    const dark = document.documentElement.classList.contains("dark-mode");
    document.body.classList.toggle("dark-mode", dark);
    elements.theme.textContent = dark ? "☀️ Modo Claro" : "🌙 Modo Oscuro";
  }

  function updateHistory() {
    const positions = currentPositions();
    elements.historyBody.replaceChildren();
    positions.forEach((position, index) => {
      const row = document.createElement("tr");
      if ((state.mode === "guided" && index === state.index - 1) || (state.mode === "free" && index === positions.length - 1)) row.className = "current-move";
      row.innerHTML = `<td>${index + 1}</td><td>Reina ${position.reina}</td><td>${position.columna}</td><td>${position.fila}</td>`;
      elements.historyBody.append(row);
    });
    elements.historyEmpty.hidden = positions.length > 0;
    elements.historySummary.textContent = state.mode === "guided" ? `Reinas colocadas: ${positions.length} / ${totalQueens}` : `Reinas colocadas: ${positions.length} / ${totalQueens}`;
  }

  function syncFullscreen() {
    const count = state.mode === "guided" ? state.index : state.manualPositions.length;
    elements.fullscreenMode.textContent = state.mode === "guided" ? "Guiado" : "Libre";
    elements.fullscreenSolution.textContent = state.mode === "guided" ? `Solución ${state.solutionIndex + 1} de ${state.solutions.length || 4}` : "Partida libre";
    elements.fullscreenCounter.textContent = `Reinas ${count} / ${totalQueens}`;
    elements.fullscreenStatus.textContent = elements.stateLabel.textContent;
    elements.fullscreenSolutionPicker.hidden = state.mode !== "guided";
    elements.fullscreenSolutionButtons.forEach(button => {
      const selected = Number(button.dataset.fullscreenSolution) === state.solutionIndex;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.disabled = state.mode !== "guided" || state.animating || state.switching;
    });
    elements.fullscreenGuidedControls.hidden = state.mode !== "guided";
    elements.fullscreenPrevious.disabled = state.mode !== "guided" || state.animating || state.switching || state.playing || state.index === 0;
    elements.fullscreenNext.disabled = state.mode !== "guided" || state.animating || state.switching || state.playing || state.index >= state.positions.length;
    elements.fullscreenPlay.textContent = state.playing ? "Ⅱ Pausar" : "▶ Reproducir";
    elements.fullscreenPlay.disabled = state.animating || state.switching;
    elements.fullscreenReset.disabled = state.animating || state.switching;
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

  function cellFor(position) {
    return elements.board.querySelector(`[data-column="${position.columna}"][data-row="${position.fila}"]`);
  }

  function currentPositions() {
    return state.mode === "guided" ? state.positions.slice(0, state.index) : state.manualPositions;
  }

  function randomPlacementOrder(positions) {
    const shuffled = positions.map(position => ({ ...position }));
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    const unchanged = shuffled.every((position, index) => sameSquare(position, positions[index]));
    if (unchanged && shuffled.length > 1) [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    return shuffled;
  }

  function makeQueen(position, current = false) {
    const queen = document.createElement("div");
    queen.className = `queen-piece${current ? " current" : ""}`;
    queen.setAttribute("aria-label", `Reina ${position.reina} en (${position.columna},${position.fila})`);
    queen.innerHTML = '<span class="queen-crown">♛</span><span class="queen-base"></span>';
    return queen;
  }

  function render() {
    elements.board.replaceChildren();
    const placedPositions = currentPositions();
    for (let row = 0; row < totalQueens; row += 1) {
      for (let column = 0; column < totalQueens; column += 1) {
        const cell = document.createElement("div");
        cell.className = `chess-cell ${(row + column) % 2 === 0 ? "light" : "dark"}`;
        const conflict = state.conflicts.some(position => position.columna === column && position.fila === row);
        if (conflict) cell.classList.add("conflict");
        cell.dataset.column = String(column);
        cell.dataset.row = String(row);
        cell.setAttribute("role", "gridcell");
        cell.setAttribute("aria-label", `Casilla (${column},${row})`);
        const placed = placedPositions.find(position => position.columna === column && position.fila === row);
        if (placed) cell.append(makeQueen(placed, state.mode === "guided" && placed.reina === state.index));
        cell.addEventListener("click", () => handleCellClick(column, row));
        elements.board.append(cell);
      }
    }
    const current = state.mode === "guided" ? (state.index > 0 ? state.positions[state.index - 1] : null) : placedPositions[placedPositions.length - 1];
    const count = state.mode === "guided" ? state.index : state.manualPositions.length;
    elements.counter.textContent = `Reinas ${count} / ${totalQueens}`;
    elements.coordinates.textContent = current ? `Actual: (${current.columna},${current.fila})` : "Sin reina actual";
    elements.stateLabel.textContent = current ? `Reina ${current.reina} · (${current.columna},${current.fila})` : state.mode === "free" ? "Tablero libre" : "Esperando solución";
    elements.progress.style.width = `${(count / totalQueens) * 100}%`;
    elements.previous.disabled = state.mode !== "guided" || state.animating || state.switching || state.playing || state.index === 0;
    elements.next.disabled = state.mode !== "guided" || state.animating || state.switching || state.playing || state.index >= state.positions.length;
    elements.reset.disabled = state.animating || state.switching;
    elements.pause.disabled = state.mode !== "guided" || state.switching || !state.playing;
    elements.solutionControl.hidden = state.mode !== "guided";
    elements.solutionButtons.forEach(button => {
      const selected = Number(button.dataset.solution) === state.solutionIndex;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.disabled = state.mode !== "guided" || state.animating || state.switching;
    });
    elements.solutionIndicator.textContent = `Solución ${state.solutionIndex + 1} de ${state.solutions.length || 4}`;
    // El botón debe permanecer disponible para solicitar la solución a Java.
    elements.start.disabled = state.mode !== "guided" || state.animating || state.switching;
    elements.guidedActions.hidden = state.mode !== "guided";
    elements.guidedMode.classList.toggle("selected", state.mode === "guided");
    elements.freeMode.classList.toggle("selected", state.mode === "free");
    updateHistory();
    syncFullscreen();
  }

  function updateMessage() {
    if (state.index === totalQueens) elements.message.textContent = `Solución ${state.solutionIndex + 1} de ${state.solutions.length || 4} completada.`;
    else if (state.index > 0) elements.message.textContent = `Reina ${state.index} colocada. Continúa la solución.`;
  }

  function conflictWith(candidate, placed) {
    for (const queen of placed) {
      if (queen.fila === candidate.fila) return { type: "fila", positions: [queen, candidate] };
      if (queen.columna === candidate.columna) return { type: "columna", positions: [queen, candidate] };
      if (Math.abs(queen.columna - candidate.columna) === Math.abs(queen.fila - candidate.fila)) {
        const type = queen.columna - queen.fila === candidate.columna - candidate.fila ? "diagonal principal" : "diagonal secundaria";
        return { type, positions: [queen, candidate] };
      }
    }
    return null;
  }

  function showConflict(conflict) {
    clearTimeout(state.conflictTimer);
    state.conflicts = conflict.positions;
    elements.message.textContent = `Colocación inválida: conflicto de ${conflict.type}.`;
    render();
    state.conflictTimer = setTimeout(() => { state.conflicts = []; render(); }, 900);
  }

  function handleCellClick(column, row) {
    if (state.mode !== "free" || state.animating || state.playing) return;
    const placedIndex = state.manualPositions.findIndex(position => position.columna === column && position.fila === row);
    if (placedIndex >= 0) {
      state.manualPositions.splice(placedIndex, 1);
      state.conflicts = [];
      elements.message.textContent = `Reina retirada de (${column},${row}).`;
      render();
      return;
    }
    if (state.manualPositions.length >= totalQueens) return;
    const candidate = { reina: state.manualPositions.length + 1, columna: column, fila: row };
    const conflict = conflictWith(candidate, state.manualPositions);
    if (conflict) {
      showConflict(conflict);
      return;
    }
    state.conflicts = [];
    state.manualPositions.push(candidate);
    playQueenLandingSound();
    elements.message.textContent = state.manualPositions.length === totalQueens ? "¡Victoria! Las 8 reinas no se atacan." : `Reina colocada en (${column},${row}).`;
    render();
  }

  async function animateQueen(position, direction) {
    state.animating = true;
    render();
    try {
      const cell = cellFor(position);
      if (!cell) return false;
      const queen = direction > 0 ? makeQueen(position, true) : cell.querySelector(".queen-piece");
      if (!queen) return false;
      if (direction > 0) cell.append(queen);
      queen.classList.remove("current");
      const boardRect = elements.board.getBoundingClientRect();
      const queenRect = queen.getBoundingClientRect();
      const entryDistance = queenRect.top - boardRect.top + queenRect.height + 18;
      const animation = direction > 0
        ? queen.animate([
          { transform: `translateY(${-entryDistance}px) scale(.94)`, filter: "drop-shadow(0 18px 8px rgba(24,18,12,.16))" },
          { transform: "translateY(-8px) scale(1.06)", filter: "drop-shadow(0 12px 6px rgba(24,18,12,.3))", offset: .78 },
          { transform: "translateY(3px) scale(.97)", filter: "drop-shadow(0 4px 2px rgba(24,18,12,.38))", offset: .92 },
          { transform: "translateY(0) scale(1)", filter: "drop-shadow(0 5px 3px rgba(37,22,13,.35))" }
        ], { duration: queenMoveDuration, easing: "cubic-bezier(.2,.78,.2,1)" })
        : queen.animate([
          { transform: "translateY(0) scale(1)", opacity: 1 },
          { transform: "translateY(-8px) scale(1.08)", opacity: .95, offset: .35 },
          { transform: `translateY(${-entryDistance}px) scale(.94)`, opacity: .65 }
        ], { duration: queenMoveDuration, easing: "ease-in" });
      const landingSoundTimer = direction > 0 ? scheduleQueenLandingSound(queenMoveDuration) : null;
      try {
        await animation.finished;
      } finally {
        if (landingSoundTimer !== null) clearTimeout(landingSoundTimer);
      }
      if (direction < 0) state.index -= 1;
      else state.index += 1;
      updateMessage();
      return true;
    } finally {
      state.animating = false;
      render();
    }
  }

  function sameSquare(origin, destination) {
    return origin.columna === destination.columna && origin.fila === destination.fila;
  }

  function assignVisualMoves(origins, destinations) {
    let bestCost = Number.POSITIVE_INFINITY;
    let bestAssignment = null;
    const used = new Array(destinations.length).fill(false);
    const assignment = new Array(origins.length);

    function search(originIndex, accumulatedCost) {
      if (accumulatedCost >= bestCost) return;
      if (originIndex === origins.length) {
        bestCost = accumulatedCost;
        bestAssignment = assignment.slice();
        return;
      }

      const origin = origins[originIndex];
      const candidates = destinations
        .map((destination, destinationIndex) => {
          const columnDistance = origin.columna - destination.columna;
          const rowDistance = origin.fila - destination.fila;
          return { destination, destinationIndex, cost: columnDistance * columnDistance + rowDistance * rowDistance };
        })
        .filter(candidate => !used[candidate.destinationIndex] && !sameSquare(origin, candidate.destination))
        .sort((first, second) => first.cost - second.cost);

      for (const candidate of candidates) {
        used[candidate.destinationIndex] = true;
        assignment[originIndex] = candidate.destination;
        search(originIndex + 1, accumulatedCost + candidate.cost);
        used[candidate.destinationIndex] = false;
      }
    }

    search(0, 0);
    return bestAssignment;
  }

  async function transitionToSolution(targetSolutionIndex) {
    if (state.mode !== "guided" || state.animating || state.playing || state.index !== totalQueens || targetSolutionIndex === state.solutionIndex) return;
    const targetPositions = state.solutions[targetSolutionIndex];
    if (!targetPositions) return;

    const currentPositions = state.positions.slice();
    const visualTargets = assignVisualMoves(currentPositions, targetPositions);
    if (!visualTargets || visualTargets.some((target, index) => sameSquare(currentPositions[index], target))) {
      elements.message.textContent = "No fue posible preparar una transición completa entre las soluciones.";
      return;
    }

    state.playing = false;
    clearTimeout(state.timer);
    state.animating = true;
    elements.message.textContent = `Reorganizando las 8 reinas hacia la solución ${targetSolutionIndex + 1}...`;
    render();
    elements.card.classList.add("solution-transitioning");

    try {
      const boardRect = elements.board.getBoundingClientRect();
      const boardLeft = boardRect.left + elements.board.clientLeft;
      const boardTop = boardRect.top + elements.board.clientTop;
      const movements = currentPositions.map((origin, index) => {
        const originCell = cellFor(origin);
        const targetCell = cellFor(visualTargets[index]);
        const queen = originCell?.querySelector(".queen-piece");
        if (!queen || !targetCell) throw new Error("No se encontraron las ocho piezas de la transición.");

        queen.classList.remove("current");
        const queenRect = queen.getBoundingClientRect();
        const targetRect = targetCell.getBoundingClientRect();
        const startLeft = queenRect.left - boardLeft;
        const startTop = queenRect.top - boardTop;
        const targetLeft = targetRect.left + (targetRect.width - queenRect.width) / 2 - boardLeft;
        const targetTop = targetRect.top + (targetRect.height - queenRect.height) / 2 - boardTop;
        const horizontal = targetLeft - startLeft;
        const vertical = targetTop - startTop;
        const computedFilter = getComputedStyle(queen).filter;
        const baseFilter = computedFilter === "none" ? "" : computedFilter;
        const restingFilter = baseFilter || "none";

        queen.classList.add("solution-transition-piece");
        Object.assign(queen.style, {
          left: `${startLeft}px`,
          top: `${startTop}px`,
          width: `${queenRect.width}px`,
          height: `${queenRect.height}px`
        });
        elements.board.append(queen);

        return {
          queen,
          frames: [
            { transform: "translate(0, 0) scale(1)", filter: restingFilter },
            { transform: "translate(0, -10px) scale(1.06)", filter: `${baseFilter ? `${baseFilter} ` : ""}drop-shadow(0 14px 7px rgba(20,18,28,.45))`, offset: .14 },
            { transform: `translate(${horizontal * .52}px, ${vertical * .52 - 16}px) scale(1.07)`, filter: `${baseFilter ? `${baseFilter} ` : ""}drop-shadow(0 18px 9px rgba(20,18,28,.4))`, offset: .56 },
            { transform: `translate(${horizontal}px, ${vertical - 5}px) scale(1.035)`, filter: `${baseFilter ? `${baseFilter} ` : ""}drop-shadow(0 10px 5px rgba(20,18,28,.34))`, offset: .88 },
            { transform: `translate(${horizontal}px, ${vertical + 2}px) scale(.98)`, filter: `${baseFilter ? `${baseFilter} ` : ""}drop-shadow(0 3px 2px rgba(20,18,28,.4))`, offset: .96 },
            { transform: `translate(${horizontal}px, ${vertical}px) scale(1)`, filter: restingFilter }
          ]
        };
      });

      for (const [movementIndex, movement] of movements.entries()) {
        const animation = movement.queen.animate(movement.frames, {
          duration: queenMoveDuration,
          easing: "cubic-bezier(.2,.72,.2,1)",
          fill: "forwards"
        });
        const landingSoundTimer = scheduleQueenLandingSound(queenMoveDuration);
        try {
          await animation.finished;
        } finally {
          clearTimeout(landingSoundTimer);
        }
        if (movementIndex < movements.length - 1) await new Promise(resolve => setTimeout(resolve, queenStepDelay));
      }
      state.positions = targetPositions;
      state.solutionIndex = targetSolutionIndex;
      state.index = totalQueens;
      elements.message.textContent = `Solución ${targetSolutionIndex + 1} de ${state.solutions.length} lista.`;
    } catch (error) {
      elements.message.textContent = `No se pudo completar la transición: ${error.message}`;
    } finally {
      elements.card.classList.remove("solution-transitioning");
      state.animating = false;
      render();
    }
  }

  async function changeSolution(targetSolutionIndex) {
    if (state.mode !== "guided" || state.animating || state.switching || targetSolutionIndex === state.solutionIndex || !state.solutions[targetSolutionIndex]) return;
    state.playing = false;
    cancelPlaybackDelay();
    state.switching = true;
    elements.message.textContent = `Preparando las 8 piezas para cambiar a la solución ${targetSolutionIndex + 1}...`;
    render();

    try {
      while (state.index < totalQueens) await step(1);
      await transitionToSolution(targetSolutionIndex);
    } finally {
      state.switching = false;
      render();
    }
  }

  function selectSolution(targetSolutionIndex) {
    if (!state.solutions.length) {
      state.solutionIndex = targetSolutionIndex;
      elements.message.textContent = `Solución ${targetSolutionIndex + 1} seleccionada. Pulsa Iniciar solución.`;
      render();
      return;
    }
    changeSolution(targetSolutionIndex);
  }

  async function step(direction) {
    if (state.mode !== "guided" || state.animating || !state.positions.length) return;
    const targetIndex = state.index + direction;
    if (targetIndex < 0 || targetIndex > state.positions.length) return;
    const position = state.positions[direction > 0 ? state.index : targetIndex];
    await animateQueen(position, direction);
  }

  async function loadSolution() {
    elements.start.disabled = true;
    elements.message.textContent = "Solicitando las 4 soluciones recursivas a Java...";
    try {
      const response = await fetch(`${BASE}/lab3/reinas`, { method: "POST" });
      const result = await response.json();
      if (!response.ok || result.totalSoluciones !== 4 || !Array.isArray(result.soluciones) || result.soluciones.length !== 4) throw new Error(result.error || "La respuesta no contiene las cuatro soluciones.");
      const solutions = result.soluciones.map(solution => {
        if (!solution || !Array.isArray(solution.posiciones) || solution.posiciones.length !== totalQueens) throw new Error("Una solución no contiene ocho posiciones.");
        const positions = solution.posiciones.map((position, index) => ({ reina: Number(position.reina || index + 1), columna: Number(position.columna), fila: Number(position.fila) }));
        const invalidPosition = positions.some(position => !Number.isInteger(position.columna) || !Number.isInteger(position.fila) || position.columna < 0 || position.columna > 7 || position.fila < 0 || position.fila > 7);
        const fixedQueen = positions.some(position => position.columna === initialPosition.columna && position.fila === initialPosition.fila);
        if (invalidPosition || !fixedQueen) throw new Error("Una solución no respeta la primera reina fija en (0,0).");
        return positions;
      });
      const selectedSolutionIndex = Math.min(state.solutionIndex, solutions.length - 1);
      state.solutions = solutions;
      state.solutionIndex = selectedSolutionIndex;
      state.positions = randomPlacementOrder(solutions[selectedSolutionIndex]);
      state.index = 0;
      elements.message.textContent = `4 soluciones recibidas desde Java. Iniciando la solución ${selectedSolutionIndex + 1}...`;
      render();
      return true;
    } catch (error) {
      elements.message.textContent = `No se pudo cargar la solución: ${error.message}`;
      elements.start.disabled = false;
      return false;
    }
  }

  function cancelPlaybackDelay() {
    clearTimeout(state.timer);
    state.timer = null;
    if (state.timerResolve) {
      const resolve = state.timerResolve;
      state.timerResolve = null;
      resolve();
    }
  }

  function waitPlaybackDelay() {
    return new Promise(resolve => {
      state.timerResolve = () => {
        state.timer = null;
        state.timerResolve = null;
        resolve();
      };
      state.timer = setTimeout(state.timerResolve, queenStepDelay);
    });
  }

  async function play() {
    if (state.mode !== "guided" || !state.positions.length || state.animating || state.switching) return;
    if (state.playing) {
      state.playing = false;
      cancelPlaybackDelay();
      elements.message.textContent = "Solución pausada.";
      render();
      return;
    }
    state.playing = true;
    elements.message.textContent = "Colocando solución...";
    render();
    while (state.playing && state.index < state.positions.length) {
      await step(1);
      if (state.playing && state.index < state.positions.length) await waitPlaybackDelay();
    }
    if (state.index >= state.positions.length) state.playing = false;
    render();
  }

  function reset() {
    if (state.animating || state.switching) return;
    state.playing = false;
    cancelPlaybackDelay();
    state.index = 0;
    state.manualPositions = [];
    state.conflicts = [];
    clearTimeout(state.conflictTimer);
    elements.message.textContent = state.mode === "free" ? "Tablero libre reiniciado." : state.positions.length ? `Solución ${state.solutionIndex + 1} reiniciada · primera reina en (0,0).` : "Carga la solución recursiva para comenzar.";
    render();
  }

  async function startGuided() {
    let loadedNow = false;
    if (!state.positions.length) {
      loadedNow = await loadSolution();
      if (!loadedNow) return;
    }
    if (!loadedNow && state.index === 0 && state.solutions[state.solutionIndex]) {
      state.positions = randomPlacementOrder(state.solutions[state.solutionIndex]);
      render();
    }
    play();
  }

  elements.theme.addEventListener("click", () => { document.documentElement.classList.toggle("dark-mode"); localStorage.setItem("theme", document.documentElement.classList.contains("dark-mode") ? "dark" : "light"); setTheme(); });
  elements.card.addEventListener("pointerdown", unlockAudio, { capture: true });
  elements.card.addEventListener("keydown", unlockAudio, { capture: true });
  elements.soundToggle.addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;
    elements.soundToggle.setAttribute("aria-pressed", String(state.soundEnabled));
    elements.soundToggle.textContent = state.soundEnabled ? "🔊 Sonido: Activado" : "🔇 Sonido: Desactivado";
    if (!state.soundEnabled) stopQueenAudio();
  });
  elements.design.addEventListener("change", event => { elements.card.dataset.style = event.target.value; setDesignPopover(false); });
  elements.designToggle.addEventListener("click", () => setDesignPopover(elements.designPopover.hidden));
  elements.fullscreenDesignToggle.addEventListener("click", () => setDesignPopover(elements.designPopover.hidden, elements.fullscreenDesignToggle));
  elements.designPopover.querySelectorAll("[data-style]").forEach(button => button.addEventListener("click", () => { elements.design.value = button.dataset.style; elements.design.dispatchEvent(new Event("change")); }));
  elements.solutionButtons.forEach(button => button.addEventListener("click", () => {
    selectSolution(Number(button.dataset.solution));
  }));
  elements.fullscreenSolutionButtons.forEach(button => button.addEventListener("click", () => {
    selectSolution(Number(button.dataset.fullscreenSolution));
  }));
  elements.gamesOpen.addEventListener("click", () => setGames(elements.gamesMenu.hidden));
  elements.gamesClose.addEventListener("click", () => setGames(false));
  elements.historyToggle.addEventListener("click", () => setHistory(elements.historyPanel.hidden));
  elements.fullscreenHistory.addEventListener("click", () => setHistory(elements.historyPanel.hidden));
  elements.historyClose.addEventListener("click", () => setHistory(false));
  elements.historyBackdrop.addEventListener("click", () => setHistory(false));
  elements.fullscreenOpen.addEventListener("click", enterFullscreen);
  elements.fullscreenExit.addEventListener("click", exitFullscreen);
  elements.fullscreenExitTop.addEventListener("click", exitFullscreen);
  elements.fullscreenPrevious.addEventListener("click", () => step(-1));
  elements.fullscreenNext.addEventListener("click", () => step(1));
  elements.fullscreenPlay.addEventListener("click", startGuided);
  elements.fullscreenReset.addEventListener("click", reset);
  document.addEventListener("fullscreenchange", () => setFullscreen(document.fullscreenElement === elements.card));
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (!elements.historyPanel.hidden) { setHistory(false); return; }
    if (!elements.designPopover.hidden) { setDesignPopover(false); return; }
    if (!elements.gamesMenu.hidden) { setGames(false); return; }
    if (document.fullscreenElement === elements.card || elements.card.classList.contains("fullscreen-fallback")) exitFullscreen();
  });
  elements.guidedMode.addEventListener("click", () => { if (state.animating || state.switching) return; state.mode = "guided"; state.playing = false; cancelPlaybackDelay(); state.index = 0; state.conflicts = []; elements.message.textContent = state.positions.length ? `Modo Guiado · solución ${state.solutionIndex + 1} de ${state.solutions.length}.` : "Modo Guiado · carga las soluciones para comenzar."; render(); });
  elements.freeMode.addEventListener("click", () => { if (state.animating || state.switching) return; state.mode = "free"; state.playing = false; cancelPlaybackDelay(); state.manualPositions = []; state.conflicts = []; elements.message.textContent = "Modo Libre · coloca una reina en el tablero."; render(); });
  elements.start.addEventListener("click", startGuided);
  elements.pause.addEventListener("click", () => play());
  elements.previous.addEventListener("click", () => step(-1));
  elements.next.addEventListener("click", () => step(1));
  elements.reset.addEventListener("click", reset);
  window.addEventListener("pagehide", stopQueenAudio);
  fetch(`${BASE}/lab3`).then(response => { if (!response.ok) throw new Error(); state.connected = true; elements.server.textContent = "● Servidor Java conectado"; elements.server.className = "server-status online"; }).catch(() => { elements.server.textContent = "● Servidor Java desconectado"; elements.server.className = "server-status offline"; });
  setTheme();
  elements.card.dataset.style = elements.design.value;
  render();
})();
