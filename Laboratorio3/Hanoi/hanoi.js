(() => {
  const BASE = "http://localhost:8080", $ = id => document.getElementById(id);
  const state = { mode: "automatic", moves: [], total: 0, index: 0, disks: 3, playing: false, timer: null, connected: false, animating: false, selected: null, manual: { A: [], B: [], C: [] } };
  let manualHistory = [];
  const towers = () => state.mode === "manual" ? state.manual : derive(state.index);
  function derive(count) { const t = { A: Array.from({ length: state.disks }, (_, i) => state.disks - i), B: [], C: [] }; for (let i = 0; i < count; i++) { const m = state.moves[i]; if (m) t[m.destino].push(t[m.origen].pop()); } return t; }
  function theme() { const d = document.documentElement.classList.contains("dark-mode"); document.body.classList.toggle("dark-mode", d); $("btnThemeToggle").textContent = d ? "☀️ Modo Claro" : "🌙 Modo Oscuro"; }
  $("btnThemeToggle").addEventListener("click", () => { document.documentElement.classList.toggle("dark-mode"); localStorage.setItem("theme", document.documentElement.classList.contains("dark-mode") ? "dark" : "light"); theme(); });
  function resetManual() { manualHistory = []; state.manual = { A: Array.from({ length: state.disks }, (_, i) => state.disks - i), B: [], C: [] }; }
  function render() { const t = towers(), board = $("hanoi-board"); board.innerHTML = ""; ["A", "B", "C"].forEach(name => { const tower = document.createElement("div"); tower.className = `hanoi-tower${state.selected === name ? " selected" : ""}`; tower.dataset.tower = name; const stack = document.createElement("div"); stack.className = "hanoi-stack"; t[name].slice().reverse().forEach(d => { const el = document.createElement("div"); el.className = `hanoi-disk${state.selected === name && d === t[name][t[name].length - 1] ? " selected" : ""}`; el.style.setProperty("--disk-width", `${35 + d / state.disks * 53}%`); el.dataset.disk = d; el.textContent = d; stack.append(el); }); tower.append(stack); const base = document.createElement("div"); base.className = "hanoi-base"; tower.append(base); const label = document.createElement("strong"); label.textContent = `TORRE ${name}`; tower.append(label); const role = document.createElement("small"); role.textContent = { A: "Origen", B: "Auxiliar", C: "Destino" }[name]; tower.append(role); board.append(tower); tower.addEventListener("click", () => towerClick(name)); }); updateInfo(); updateHistory(); }
  function updateInfo() { const total = state.mode === "manual" ? state.total : state.moves.length; $("counter-label").textContent = state.mode === "manual" ? "MOVIMIENTOS REALIZADOS" : "MOVIMIENTO ACTUAL"; $("counter").textContent = `${state.mode === "manual" ? manualCount() : state.index} / ${total}`; $("previous").hidden = state.mode === "manual"; $("next").hidden = state.mode === "manual"; updateStartButton(); if (state.mode === "manual" && state.manual.C.length === state.disks) $("message").textContent = manualCount() === state.total ? "Solución óptima completada." : `Solución completada con ${manualCount() - state.total} movimientos adicionales.`; }
  function manualCount() { return state.manual._count || 0; }
  function lock(flag) {
    state.animating = flag;
    ["simulate", "reset", "fullscreen-open", "automatic-mode", "manual-mode", "disks"].forEach(id => { $(id).disabled = flag; });
    $("simulate").disabled = !state.connected || (flag && !state.playing);
    $("previous").disabled = flag || state.playing || !state.index;
    $("next").disabled = flag || state.playing || state.index >= state.moves.length;
  }
  async function animate(move, done) {
    const board = $("hanoi-board");
    const source = board.querySelector(`[data-tower="${move.origen}"] .hanoi-disk`);
    if (!source) { stop(); $("message").textContent = "No se encontró el disco de origen."; return; }
    const destination = board.querySelector(`[data-tower="${move.destino}"] .hanoi-stack`);
    const r = source.getBoundingClientRect(), to = destination.getBoundingClientRect(), br = board.getBoundingClientRect();
    const clone = source.cloneNode(true), x0 = r.left - br.left - board.clientLeft, y0 = r.top - br.top - board.clientTop;
    const x = to.left - br.left - board.clientLeft + (to.width - r.width) / 2;
    const margin = parseFloat(getComputedStyle(source).marginBottom) || 0;
    const down = to.bottom - br.top - board.clientTop - margin - r.height - towers()[move.destino].length * (r.height + margin * 2);
    const lift = to.top - br.top - board.clientTop - r.height - 10;
    Object.assign(clone.style, { width: `${r.width}px`, height: `${r.height}px`, boxSizing: "border-box", left: `${x0}px`, top: `${y0}px` });
    clone.classList.add("hanoi-flying");
    board.append(clone); source.style.visibility = "hidden"; lock(true);
    try {
      await clone.animate([
        { transform: "translate(0,0)" },
        { transform: `translate(0,${lift-y0}px)`, offset: 1/3 },
        { transform: `translate(${x-x0}px,${lift-y0}px)`, offset: 2/3 },
        { transform: `translate(${x-x0}px,${down-y0}px)` }
      ], { duration: speed() * 3, easing: "linear", fill: "forwards" }).finished;
      done();
    } catch {
      stop(); $("message").textContent = "Movimiento interrumpido. Puedes volver a intentarlo.";
    } finally {
      clone.remove(); source.style.visibility = ""; lock(false);
    }
  }
  function speed() { return Math.max(120, Number($("speed").value) / 2); }
  async function autoStep(delta) {
    if (state.animating || !state.moves.length) return;
    const target = state.index + delta;
    if (target < 0 || target > state.moves.length) return;
    const original = state.moves[delta > 0 ? state.index : target];
    const move = delta > 0 ? original : { origen: original.destino, destino: original.origen };
    await animate(move, () => { state.index = target; render(); });
  }
  async function play() {
    if (state.playing) { stop(); lock(state.animating); return; }
    if (state.animating || !state.moves.length) return;
    if (state.index === state.moves.length) reset();
    state.playing = true; updateStartButton();
    while (state.playing && state.index < state.moves.length) await autoStep(1);
    stop(); lock(state.animating);
  }
  function towerClick(name) { if (state.mode !== "manual" || state.animating || !state.moves.length || state.manual.C.length === state.disks) return; if (!state.selected) { if (!state.manual[name].length) { $("message").textContent = "Esa torre está vacía."; return; } state.selected = name; $("message").textContent = `Torre ${name} seleccionada. Elige una torre destino.`; render(); return; } if (state.selected === name) { state.selected = null; render(); return; } const from = state.selected, disk = state.manual[from].at(-1), target = state.manual[name].at(-1); if (target !== undefined && target < disk) { $("message").textContent = "Movimiento inválido: no puedes colocar un disco mayor sobre uno menor."; return; } const move = { origen: from, destino: name, numero: disk }; state.selected = null; render(); animate(move, () => { manualHistory.push({ ...move }); state.manual[from].pop(); state.manual[name].push(disk); state.manual._count = manualCount() + 1; render(); }); }
  async function load(mode) { const input = Number($("disks").value); if (!Number.isInteger(input) || input < 1 || input > 7) { $("message").textContent = "La cantidad de discos debe ser un número entero entre 1 y 7."; return false; } if (state.animating) return false; stop(); lock(true); state.disks = input; state.mode = mode; state.index = 0; state.selected = null; $("simulate").disabled = true; try { const r = await fetch(`${BASE}/lab3/hanoi`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" }, body: new URLSearchParams({ discos: String(input) }) }); const data = await r.json(); if (!r.ok) throw Error(data.error || `Error HTTP ${r.status}`); state.moves = Array.isArray(data.movimientos) ? data.movimientos : []; state.total = Number(data.total ?? data.totalMovimientos ?? state.moves.length); resetManual(); state.manual._count = 0; $("message").textContent = mode === "manual" ? "Modo Libre · Selecciona una torre de origen." : "Solución recibida desde Java · Iniciando recorrido."; render(); return true; } catch (e) { $("message").textContent = `No se pudo cargar la solución: ${e.message}. Ejecuta Servidor.java.`; return false; } finally { lock(false); } }
  function updateStartButton() { if (state.mode === "manual") { $("simulate").textContent = "Iniciar partida"; return; } if (state.playing) $("simulate").textContent = "Ⅱ Pausar"; else if (state.moves.length && state.index > 0 && state.index < state.moves.length) $("simulate").textContent = "Continuar solución"; else $("simulate").textContent = "Iniciar solución"; }
  function stop() { state.playing = false; clearTimeout(state.timer); updateStartButton(); }
  function reset() { if (state.animating) return; stop(); state.selected = null; state.index = 0; resetManual(); state.manual._count = 0; render(); }
  async function check() { try { const r = await fetch(`${BASE}/lab3`); if (!r.ok) throw Error(); state.connected = true; $("server-status").textContent = "● Servidor Java conectado"; $("server-status").className = "server-status online"; $("simulate").disabled = false; } catch { state.connected = false; $("server-status").textContent = "● Servidor Java desconectado"; $("server-status").className = "server-status offline"; $("simulate").disabled = true; $("message").textContent = "Ejecuta Servidor.java para habilitar la simulación."; } }
  function selectMode(mode) { if (state.animating) return; state.mode = mode; $("automatic-mode").classList.toggle("selected", mode === "automatic"); $("manual-mode").classList.toggle("selected", mode === "manual"); stop(); state.index = 0; state.selected = null; resetManual(); state.manual._count = 0; $("message").textContent = mode === "manual" ? "Modo Libre · Pulsa Iniciar o selecciona una torre de origen." : "Modo Guiado · Pulsa Iniciar para recibir la solución de Java."; render(); }
  const stylePicker = document.createElement("div");
  stylePicker.id = "design-popover"; stylePicker.hidden = true; stylePicker.className = "hanoi-styles"; stylePicker.setAttribute("role", "group"); stylePicker.setAttribute("aria-label", "Estilo visual");
  const card = document.querySelector(".hanoi-card");
  function setStyle(style) {
    card.dataset.style = style;
    stylePicker.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.style === style)));
  }
  [["uni", "UNI"], ["escolar", "Escolar"], ["futurista", "Futurista"]].forEach(([value, title]) => {
    const b = document.createElement("button"); b.type = "button"; b.textContent = title; b.dataset.style = value;
    b.addEventListener("click", () => { setStyle(value); closeDesign(); }); stylePicker.append(b);
  });
  document.querySelector(".design-control").append(stylePicker); setStyle("uni");
  function closeDesign(focus = true) {
    stylePicker.hidden = true; $("design-toggle").setAttribute("aria-expanded", "false");
    if (focus) $("design-toggle").focus();
  }
  $("design-toggle").addEventListener("click", () => {
    const open = stylePicker.hidden;
    stylePicker.hidden = !open; $("design-toggle").setAttribute("aria-expanded", String(open));
    if (open) stylePicker.querySelector('[aria-pressed="true"]').focus();
  });
  document.addEventListener("click", e => {
    if (!stylePicker.hidden && !document.querySelector(".design-control").contains(e.target)) closeDesign(false);
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !stylePicker.hidden) { closeDesign(); e.preventDefault(); }
  });
  const sidebar = $("games-sidebar");
  $("games-open").addEventListener("click", () => {
    closeDesign(false); sidebar.showModal(); $("games-open").setAttribute("aria-expanded", "true"); $("games-close").focus();
  });
  $("games-close").addEventListener("click", () => sidebar.close());
  sidebar.addEventListener("click", e => {
    const r = sidebar.getBoundingClientRect();
    if (e.target === sidebar && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) sidebar.close();
  });
  sidebar.addEventListener("close", () => { $("games-open").setAttribute("aria-expanded", "false"); $("games-open").focus(); });
  const historyPanel = $("history-panel");
  function closeHistory(focus = true) {
    historyPanel.hidden = true;
    $("history-toggle").setAttribute("aria-expanded", "false");
    if (focus) $("history-toggle").focus();
  }
  $("history-toggle").addEventListener("click", () => {
    const open = historyPanel.hidden;
    historyPanel.hidden = !open;
    $("history-toggle").setAttribute("aria-expanded", String(open));
    if (open) $("history-close").focus();
  });
  $("history-close").addEventListener("click", () => closeHistory());
  document.addEventListener("click", event => {
    if (!historyPanel.hidden && !historyPanel.contains(event.target) && event.target !== $("history-toggle")) closeHistory(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !historyPanel.hidden) {
      closeHistory();
      event.preventDefault();
    }
  });
  $("automatic-mode").addEventListener("click", () => selectMode("automatic"));
  $("manual-mode").addEventListener("click", () => { selectMode("manual"); load("manual"); });
  $("simulate").addEventListener("click", async () => {
    if (state.mode === "manual") { await load("manual"); return; }
    if (state.playing) { stop(); lock(state.animating); return; }
    const disksChanged = Number($("disks").value) !== state.disks;
    if (!state.moves.length || disksChanged) {
      const loaded = await load("automatic");
      if (!loaded) return;
    }
    await play();
  });
  $("reset").addEventListener("click", reset);
  $("previous").addEventListener("click", () => autoStep(-1));
  $("next").addEventListener("click", () => autoStep(1));
  function updateHistory() {
    const history = state.mode === "manual" ? manualHistory : state.moves.slice(0, state.index);
    $("move-history").replaceChildren();
    history.forEach(m => {
      const li = document.createElement("li");
      li.textContent = `Torre ${m.origen} → Torre ${m.destino}`;
      $("move-history").append(li);
    });
    $("history-empty").hidden = history.length > 0;
    $("move-history").scrollTop = $("move-history").scrollHeight;
  }
  const stage = card;
  function syncFullscreen() {
    const full = document.fullscreenElement === stage || stage.classList.contains("fullscreen-fallback");
    $("fullscreen-exit").hidden = !full;
    $("fullscreen-open").setAttribute("aria-expanded", String(full));
    if (!full) $("fullscreen-open").focus();
  }
  $("fullscreen-open").addEventListener("click", async () => {
    if (state.animating) return;
    stop(); lock(false); closeDesign(false);
    try {
      if (!stage.requestFullscreen) throw new Error("Fullscreen no disponible");
      await stage.requestFullscreen();
    } catch { stage.classList.add("fullscreen-fallback"); }
    syncFullscreen(); $("fullscreen-exit").focus();
  });
  async function exitFullscreen() {
    if (document.fullscreenElement === stage) await document.exitFullscreen();
    stage.classList.remove("fullscreen-fallback"); syncFullscreen();
  }
  $("fullscreen-exit").addEventListener("click", exitFullscreen);
  document.addEventListener("fullscreenchange", syncFullscreen);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && stage.classList.contains("fullscreen-fallback")) exitFullscreen();
  });
  theme(); resetManual(); render(); check();
})();
