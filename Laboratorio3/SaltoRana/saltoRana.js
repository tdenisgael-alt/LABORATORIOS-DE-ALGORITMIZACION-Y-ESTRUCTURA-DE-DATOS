(() => {
	const BASE = window.API_BASE;
	const initialState = "VVV_CCC";
	const optimalMoves = 15;
	const elements = {
		board: document.getElementById("frog-board"),
		counter: document.getElementById("counter"),
		message: document.getElementById("message"),
		progress: document.getElementById("progress"),
		optimalNote: document.getElementById("optimal-note"),
		stateLabel: document.getElementById("state-label"),
		speed: document.getElementById("speed"),
		designToggle: document.getElementById("design-toggle"),
		soundToggle: document.getElementById("sound-toggle"),
		fullscreenHud: document.getElementById("fullscreen-hud"),
		fullscreenMode: document.getElementById("fullscreen-mode"),
		fullscreenState: document.getElementById("fullscreen-state"),
		fullscreenCounter: document.getElementById("fullscreen-counter"),
		fullscreenStatus: document.getElementById("fullscreen-status"),
		fullscreenGuided: document.getElementById("fullscreen-guided-controls"),
		fullscreenFreeSummary: document.getElementById("fullscreen-free-summary"),
		fullscreenPlay: document.getElementById("fullscreen-play"),
		fullscreenPrevious: document.getElementById("fullscreen-previous"),
		fullscreenNext: document.getElementById("fullscreen-next"),
		fullscreenReset: document.getElementById("fullscreen-reset"),
		fullscreenOpen: document.getElementById("fullscreen-open"),
		fullscreenExit: document.getElementById("fullscreen-exit"),
		fullscreenExitTop: document.getElementById("fullscreen-exit-top"),
		fullscreenDesignToggle: document.getElementById("fullscreen-design-toggle"),
		fullscreenSoundToggle: document.getElementById("fullscreen-sound-toggle"),
		fullscreenHistory: document.getElementById("fullscreen-history"),
		gamesMenu: document.getElementById("games-menu"),
		gamesOpen: document.getElementById("games-open"),
		gamesClose: document.getElementById("games-close"),
		historyToggle: document.getElementById("history-toggle"),
		historyPanel: document.getElementById("history-panel"),
		historyBackdrop: document.getElementById("history-backdrop"),
		historyClose: document.getElementById("history-close"),
		historySummary: document.getElementById("history-summary"),
		historyEmpty: document.getElementById("history-empty"),
		historyBody: document.getElementById("history-body"),
		server: document.getElementById("server-status"),
		guidedActions: document.getElementById("guided-actions"),
		guidedMode: document.getElementById("guided-mode"),
		freeMode: document.getElementById("free-mode"),
		start: document.getElementById("start"),
		pause: document.getElementById("pause"),
		previous: document.getElementById("previous"),
		next: document.getElementById("next"),
		reset: document.getElementById("reset"),
		theme: document.getElementById("btnThemeToggle")
	};
	const state = {
		mode: "guided",
		states: [initialState],
		index: 0,
		freeState: initialState,
		freeMoves: 0,
		freeHistory: [],
		selected: null,
		playing: false,
		animating: false,
		connected: false,
		soundEnabled: true,
		timer: null
	};

	function setTheme() {
		const dark = document.documentElement.classList.contains("dark-mode");
		document.body.classList.toggle("dark-mode", dark);
		elements.theme.textContent = dark ? "☀️ Modo Claro" : "🌙 Modo Oscuro";
	}

	let audioContext = null;
	let soundGain = null;
	const soundVoices = new Set();
	let mediaUnlocked = false;
	const frogAudio = {
		background: new Audio("../assets/audio/Fondo_rana.mp3"),
		green: new Audio("../assets/audio/rana_verde.mp3"),
		coral: new Audio("../assets/audio/Rana_cafe.mp3"),
		impact: new Audio("../assets/audio/Impacto_rana.mp3")
	};
	frogAudio.background.loop = true;
	frogAudio.background.volume = 0.12;
	frogAudio.green.volume = 0.34;
	frogAudio.coral.volume = 0.34;
	frogAudio.impact.volume = 0.28;

	function primeMedia(audio) {
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

	function syncBackgroundAudio() {
		if (state.soundEnabled && mediaUnlocked) frogAudio.background.play().catch(() => {});
		else frogAudio.background.pause();
	}

	function unlockMediaAudio(startBackground = true) {
		if (mediaUnlocked) return;
		mediaUnlocked = true;
		[frogAudio.green, frogAudio.coral, frogAudio.impact].forEach(primeMedia);
		if (startBackground) syncBackgroundAudio();
	}

	function playMedia(audio) {
		if (!state.soundEnabled || !mediaUnlocked) return;
		audio.currentTime = 0;
		audio.play().catch(() => {});
	}
	function prepareAudio() {
		if (!state.soundEnabled) return;
		const AudioContextClass = window.AudioContext || window.webkitAudioContext;
		if (!AudioContextClass) return;
		try {
			if (!audioContext) {
				audioContext = new AudioContextClass();
				soundGain = audioContext.createGain();
				soundGain.connect(audioContext.destination);
			}
			if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
		} catch {
			// El audio es opcional y nunca debe bloquear un salto.
		}
	}

	function playTone(frequency, duration, volume = 0.035, type = "sine", delay = 0) {
		if (!state.soundEnabled) return;
		prepareAudio();
		// No dejar tonos pendientes que puedan sonar tarde al desbloquear el audio.
		if (audioContext?.state !== "running" || !soundGain) return;
		try {
			const start = audioContext.currentTime + delay;
			const oscillator = audioContext.createOscillator();
			const gain = audioContext.createGain();
			oscillator.type = type;
			oscillator.frequency.setValueAtTime(frequency, start);
			gain.gain.setValueAtTime(0.0001, start);
			gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
			gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
			oscillator.connect(gain).connect(soundGain);
			soundVoices.add(oscillator);
			oscillator.onended = () => { soundVoices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
			oscillator.start(start);
			oscillator.stop(start + duration + 0.02);
		} catch {
			// El sonido es opcional; una API de audio bloqueada no detiene el juego.
		}
	}

	function playJumpSound(kind) {
		const audio = kind === "V" ? frogAudio.green : frogAudio.coral;
		const other = kind === "V" ? frogAudio.coral : frogAudio.green;
		other.pause();
		other.currentTime = 0;
		playMedia(audio);
	}

	function playImpactSound() {
		[frogAudio.green, frogAudio.coral].forEach(audio => {
			audio.pause();
			audio.currentTime = 0;
		});
		playMedia(frogAudio.impact);
	}

	function playInvalidSound() {
		playTone(150, 0.09, 0.025, "triangle");
	}

	function playVictorySound() {
		[523, 659, 784].forEach((frequency, index) => playTone(frequency, 0.18, 0.03, "sine", index * 0.12));
	}

	function speed() {
		return Math.max(180, Number(elements.speed.value) || 600);
	}

	function updateFullscreenHud() {
		const guided = state.mode === "guided";
		const current = guided ? state.index : state.freeMoves;
		const total = guided ? state.states.length - 1 || optimalMoves : optimalMoves;
		elements.fullscreenMode.textContent = guided ? "Guiado" : "Libre";
		elements.fullscreenState.textContent = currentBoardState();
		elements.fullscreenCounter.textContent = guided ? `Movimiento ${current} / ${total}` : `Movimientos ${current} / óptimos ${total}`;
		elements.fullscreenStatus.textContent = elements.message.textContent;
		elements.fullscreenGuided.hidden = !guided;
		elements.fullscreenFreeSummary.hidden = guided;
		elements.fullscreenFreeSummary.textContent = `Movimientos realizados: ${state.freeMoves} · Óptimo: ${optimalMoves}`;
		elements.fullscreenPlay.textContent = state.playing ? "Ⅱ Pausar" : state.index > 0 && state.index < state.states.length - 1 ? "▶ Continuar" : "▶ Reproducir";
		if (!state.playing && state.index === 0) elements.fullscreenPlay.textContent = "▶ Iniciar";
		elements.fullscreenSoundToggle.textContent = state.soundEnabled ? "🔊" : "🔇";
		elements.fullscreenSoundToggle.setAttribute("aria-pressed", String(state.soundEnabled));
		elements.fullscreenPlay.disabled = !state.connected || state.animating;
		elements.fullscreenPrevious.disabled = state.animating || state.playing || state.index === 0;
		elements.fullscreenNext.disabled = state.animating || state.playing || state.index >= state.states.length - 1;
		elements.fullscreenReset.disabled = state.animating;
		elements.fullscreenDesignToggle.disabled = state.animating;
	}

	function makeFrog(kind) {
		const frog = document.createElement("div");
		frog.className = `frog ${kind === "V" ? "frog-green" : "frog-coral"}`;
		frog.setAttribute("aria-label", `Rana ${kind}`);
		frog.innerHTML = '<span class="frog-eye left"></span><span class="frog-eye right"></span><span class="frog-body"></span><span class="frog-accessory" aria-hidden="true"></span>';
		return frog;
	}

	function currentBoardState() {
		return state.mode === "guided" ? state.states[state.index] : state.freeState;
	}

	function validDestinations(source) {
		if (state.mode !== "free" || state.freeState[source] === "_") return [];
		const kind = state.freeState[source];
		const direction = kind === "V" ? 1 : -1;
		const destinations = [];
		const oneStep = source + direction;
		const jump = source + direction * 2;
		if (state.freeState[oneStep] === "_") destinations.push(oneStep);
		if (state.freeState[jump] === "_" && state.freeState[source + direction] === (kind === "V" ? "C" : "V")) destinations.push(jump);
		return destinations;
	}

	function historyRows() {
		if (state.mode === "free") return state.freeHistory;
		const rows = [];
		for (let index = 1; index <= state.index; index += 1) {
			const move = changedPositions(state.states[index - 1], state.states[index]);
			rows.push({ number: index, kind: move.kind, source: move.source, destination: move.destination });
		}
		return rows;
	}

	function renderHistory() {
		const rows = historyRows();
		elements.historyBody.innerHTML = "";
		elements.historyEmpty.hidden = rows.length > 0;
		elements.historySummary.textContent = state.mode === "free"
			? `Realizados: ${state.freeMoves} / Óptimo: ${optimalMoves}`
			: `Movimientos ejecutados: ${rows.length} / ${state.states.length - 1 || optimalMoves}`;
		rows.forEach((row, index) => {
			const tableRow = document.createElement("tr");
			if (index === rows.length - 1) tableRow.className = "current-move";
			[ row.number || index + 1, row.kind, row.source + 1, row.destination + 1 ].forEach(value => {
				const cell = document.createElement("td");
				cell.textContent = String(value);
				tableRow.append(cell);
			});
			elements.historyBody.append(tableRow);
		});
		if (rows.length && !elements.historyPanel.hidden) requestAnimationFrame(() => elements.historyBody.lastElementChild?.scrollIntoView({ block: "nearest" }));
	}

	function render(boardState = currentBoardState()) {
		// Pausar puede actualizar controles; la rana en vuelo debe seguir conectada.
		if (!state.animating) renderBoard(boardState);

		if (state.mode === "guided") {
			const moves = state.states.length - 1;
			elements.counter.textContent = `Movimiento ${state.index} / ${moves || optimalMoves}`;
			elements.progress.style.width = `${moves ? (state.index / moves) * 100 : 0}%`;
			elements.optimalNote.hidden = true;
			elements.previous.disabled = state.animating || state.playing || state.index === 0;
			elements.next.disabled = state.animating || state.playing || state.index >= moves;
			elements.start.disabled = state.animating || !state.states.length;
		} else {
			elements.counter.textContent = `Movimientos realizados: ${state.freeMoves}`;
			elements.progress.style.width = `${Math.min(100, (state.freeMoves / optimalMoves) * 100)}%`;
			elements.optimalNote.hidden = false;
			elements.previous.disabled = true;
			elements.next.disabled = true;
			elements.start.disabled = true;
		}
		elements.guidedActions.hidden = state.mode !== "guided";
		elements.guidedMode.classList.toggle("selected", state.mode === "guided");
		elements.freeMode.classList.toggle("selected", state.mode === "free");
		elements.reset.disabled = state.animating;
		elements.pause.disabled = !state.playing || state.mode !== "guided";
		elements.stateLabel.textContent = boardState;
		renderHistory();
		updateFullscreenHud();
	}

	function renderBoard(boardState) {
		elements.board.innerHTML = "";
		const destinations = validDestinations(state.selected);
		[...boardState].forEach((kind, index) => {
			const slot = document.createElement("div");
			const selected = state.mode === "free" && state.selected === index;
			const valid = state.mode === "free" && destinations.includes(index);
			slot.className = `frog-slot${kind === "_" ? " empty" : ""}${selected ? " selected" : ""}${valid ? " valid-destination" : ""}`;
			slot.dataset.position = String(index);
			slot.setAttribute("aria-label", kind === "_" ? "Posición vacía" : `Posición ${kind}`);
			if (kind !== "_") slot.append(makeFrog(kind));
			slot.addEventListener("click", () => selectPosition(index));
			elements.board.append(slot);
		});
	}

	let invalidAnimation = null;
	function showInvalid(position, message) {
		elements.message.textContent = message;
		updateFullscreenHud();
		playInvalidSound();
		invalidAnimation?.cancel();
		const slot = elements.board.querySelector(`[data-position="${position}"]`);
		if (!slot) return;
		invalidAnimation = slot.animate([
			{ transform: "translateX(0)", boxShadow: "inset 0 0 0 3px #e06d59" },
			{ transform: "translateX(-4px)", offset: .2 },
			{ transform: "translateX(4px)", offset: .4 },
			{ transform: "translateX(-2px)", offset: .6 },
			{ transform: "translateX(0)", boxShadow: "inset 0 0 0 0px transparent" }
		], { duration: 300, easing: "ease-out" });
	}

	function selectPosition(position) {
		if (state.mode !== "free" || state.animating || state.playing) return;
		const kind = state.freeState[position];
		if (state.selected === null) {
			if (kind === "_") {
				showInvalid(position, "Selecciona una rana.");
				return;
			}
			state.selected = position;
			elements.message.textContent = `Rana ${kind} seleccionada. Elige un destino marcado.`;
			render();
			return;
		}
		if (position === state.selected) {
			state.selected = null;
			elements.message.textContent = "Selección cancelada.";
			render();
			return;
		}
		if (!validDestinations(state.selected).includes(position)) {
			showInvalid(position, "Movimiento inválido: avanza al vacío o salta sobre una rana del otro equipo.");
			return;
		}
		animateFree(state.selected, position);
	}

	function changedPositions(from, to) {
		const source = [...from].findIndex((value, index) => value !== "_" && to[index] === "_");
		const destination = [...to].findIndex((value, index) => value !== "_" && from[index] === "_");
		return { source, destination, kind: to[destination] || from[source] };
	}

	function triggerLandingReaction(position, crossing, moveDuration) {
		const slot = elements.board.querySelector(`[data-position="${position}"]`);
		if (!slot) return;
		playImpactSound();

		const reactionDuration = Math.round(Math.max(260, Math.min(720, moveDuration * 0.55)));
		slot.style.setProperty("--impact-duration", `${reactionDuration}ms`);
		slot.classList.add("landing-impact", crossing ? "impact-strong" : "impact-soft");

		const rippleCount = crossing ? 3 : 2;
		for (let index = 0; index < rippleCount; index += 1) {
			const ripple = document.createElement("span");
			ripple.className = `landing-ripple ripple-${index + 1}`;
			ripple.setAttribute("aria-hidden", "true");
			slot.appendChild(ripple);
		}

		window.setTimeout(() => {
			if (!slot.isConnected) return;
			slot.classList.remove("landing-impact", "impact-strong", "impact-soft");
			slot.style.removeProperty("--impact-duration");
			slot.querySelectorAll(".landing-ripple").forEach(ripple => ripple.remove());
		}, reactionDuration + 180);
	}

	async function animateMove(source, destination, kind, nextState, onComplete) {
		if (state.animating) return;
		const sourceSlot = elements.board.querySelector(`[data-position="${source}"]`);
		const destinationSlot = elements.board.querySelector(`[data-position="${destination}"]`);
		const sourceFrog = sourceSlot?.querySelector(".frog");
		if (!sourceFrog || !destinationSlot) return;
		invalidAnimation?.cancel();
		// Medir nodos conectados; no reconstruir el tablero hasta el aterrizaje.
		lock(true);
		render();
		const boardRect = elements.board.getBoundingClientRect();
		const sourceRect = sourceFrog.getBoundingClientRect();
		const destinationRect = destinationSlot.getBoundingClientRect();
		const destinationStyle = getComputedStyle(destinationSlot);
		const boardLeft = boardRect.left + elements.board.clientLeft;
		const boardTop = boardRect.top + elements.board.clientTop;
		const landingLeft = destinationRect.left + (destinationRect.width - sourceRect.width) / 2;
		const landingTop = destinationRect.bottom - parseFloat(destinationStyle.borderBottomWidth) - parseFloat(destinationStyle.paddingBottom) - sourceRect.height;
		const x = landingLeft - sourceRect.left;
		const y = landingTop - sourceRect.top;
		const crossing = Math.abs(destination - source) === 2;
		const availableHeight = Math.max(0, Math.min(sourceRect.top, landingTop) - boardTop - 12);
		const arcHeight = Math.min(availableHeight, sourceRect.height * (crossing ? 1.05 : .45) + (crossing ? 18 : 12));
		const duration = speed() * (crossing ? 1.15 : 1);
		const flying = sourceFrog.cloneNode(true);
		flying.classList.add("frog-flying");
		flying.setAttribute("aria-hidden", "true");
		Object.assign(flying.style, { left: `${sourceRect.left - boardLeft}px`, top: `${sourceRect.top - boardTop}px`, width: `${sourceRect.width}px`, height: `${sourceRect.height}px` });
		elements.board.append(flying);
		sourceFrog.style.visibility = "hidden";
		const direction = x < 0 ? -1 : 1;
		const shadow = document.createElement("span");
		shadow.className = "jump-shadow";
		shadow.setAttribute("aria-hidden", "true");
		Object.assign(shadow.style, { left: `${sourceRect.left - boardLeft + sourceRect.width * 0.15}px`, top: `${sourceRect.bottom - boardTop - 4}px`, width: `${sourceRect.width * 0.7}px` });
		elements.board.append(shadow);
		let shadowAnimation;
		let flightAnimation;
		let landed = false;
		try {
			const frames = [
				{ transform: "translate(0, 0) scale(1, 1)", offset: 0 },
				{ transform: "translate(0, 0) scale(1.1, .88)", offset: .1 }
			];
			const shadowFrames = [{ transform: "translate(0, 0) scale(1)", opacity: .38, offset: 0 }];
			// Solo trayectoria visual parabólica: origen y destino vienen del estado del juego.
			for (let sample = 0; sample <= 24; sample += 1) {
				const t = sample / 24;
				const height = 4 * t * (1 - t);
				const offset = .14 + t * .7;
				const stretch = Math.sin(Math.PI * t * 2) * .055;
				frames.push({ transform: `translate(${x * t}px, ${y * t - arcHeight * height}px) rotate(${direction * Math.sin(2 * Math.PI * t) * 5}deg) scale(${1 - stretch}, ${1 + stretch})`, offset });
				shadowFrames.push({ transform: `translate(${x * t}px, ${y * t}px) scale(${1 - height * .48})`, opacity: .38 - height * .24, offset });
			}
			frames.push(
				{ transform: `translate(${x}px, ${y}px) scale(1.12, .86)`, offset: .9 },
				{ transform: `translate(${x}px, ${y}px) scale(1, 1)`, offset: 1 }
			);
			shadowFrames.push({ transform: `translate(${x}px, ${y}px) scale(1.1)`, opacity: .42, offset: .9 }, { transform: `translate(${x}px, ${y}px) scale(1)`, opacity: .38, offset: 1 });
			const timing = { duration, easing: "linear", fill: "forwards" };
			flightAnimation = flying.animate(frames, timing);
			shadowAnimation = shadow.animate(shadowFrames, timing);
			// Mismo instante de inicio para rana, sombra y sonido, sin esperar al audio.
			const startTime = document.timeline.currentTime;
			flightAnimation.startTime = startTime;
			shadowAnimation.startTime = startTime;
			playJumpSound(kind);
			await flightAnimation.finished;
			landed = true;
			onComplete(nextState, kind);
		} finally {
			flightAnimation?.cancel();
			shadowAnimation?.cancel();
			shadow.remove();
			flying.remove();
			sourceFrog.style.visibility = "";
			lock(false);
			render();
			if (landed) triggerLandingReaction(destination, crossing, duration);
		}
	}

	function lock(flag) {
		state.animating = flag;
		["guided-mode", "free-mode", "speed", "design-toggle", "fullscreen-open", "reset"].forEach(id => {
			const control = document.getElementById(id);
			if (control) control.disabled = flag;
		});
		updateFullscreenHud();
	}

	async function animateTo(target) {
		if (state.mode !== "guided" || state.animating || target < 0 || target >= state.states.length || target === state.index) return;
		const move = changedPositions(state.states[state.index], state.states[target]);
		await animateMove(move.source, move.destination, move.kind, state.states[target], nextState => {
			state.index = state.states.indexOf(nextState);
			if (nextState === "CCC_VVV") playVictorySound();
			elements.message.textContent = state.index === state.states.length - 1 ? "Solución completada." : `Movimiento ${state.index} ejecutado.`;
		});
	}

	async function animateFree(source, destination) {
		const kind = state.freeState[source];
		const nextState = [...state.freeState];
		nextState[destination] = kind;
		nextState[source] = "_";
		state.selected = null;
		await animateMove(source, destination, kind, nextState.join(""), updatedState => {
			state.freeState = updatedState;
			state.freeMoves += 1;
			state.freeHistory.push({ number: state.freeMoves, kind, source, destination });
			if (state.freeState === "CCC_VVV") {
				const difference = state.freeMoves - optimalMoves;
				playVictorySound();
				elements.message.textContent = difference === 0 ? "¡Victoria en 15 movimientos!" : `¡Victoria! Usaste ${difference} movimientos adicionales.`;
			} else {
				elements.message.textContent = `Movimiento ${state.freeMoves} realizado.`;
			}
		});
	}

	async function loadSolution() {
		elements.start.disabled = true;
		elements.message.textContent = "Solicitando solución recursiva a Java...";
		try {
			const response = await fetch(`${BASE}/lab3/rana`, { method: "POST" });
			const result = await response.json();
			if (!response.ok || !Array.isArray(result.estados) || result.estados.length < 2) throw new Error(result.error || "La respuesta no contiene una solución válida.");
			state.states = result.estados;
			state.index = 0;
			elements.message.textContent = `Solución cargada: ${result.totalMovimientos} movimientos.`;
			render();
			return true;
		} catch (error) {
			elements.message.textContent = `No se pudo cargar la solución: ${error.message}`;
			elements.start.disabled = false;
			return false;
		}
	}

	async function play() {
		if (state.mode !== "guided" || !state.states.length) return;
		if (state.playing) {
			state.playing = false;
			clearTimeout(state.timer);
			elements.message.textContent = "Solución pausada.";
			render();
			return;
		}
		state.playing = true;
		elements.message.textContent = "Reproduciendo solución...";
		while (state.playing && state.index < state.states.length - 1) {
			await animateTo(state.index + 1);
			if (state.playing && state.index < state.states.length - 1) await new Promise(resolve => { state.timer = setTimeout(resolve, 260); });
		}
		if (state.index >= state.states.length - 1) state.playing = false;
		render();
	}

	function reset() {
		state.playing = false;
		clearTimeout(state.timer);
		state.selected = null;
		if (state.mode === "guided") {
			state.index = 0;
			elements.message.textContent = "Estado inicial · VVV_CCC.";
		} else {
			state.freeState = initialState;
			state.freeMoves = 0;
			state.freeHistory = [];
			elements.message.textContent = "Estado inicial · VVV_CCC.";
		}
		render();
		closeHistory(false);
	}

	const card = document.querySelector(".frog-card");
	// Desbloquear Web Audio durante el gesto, antes de esperar la respuesta de Java.
	card.addEventListener("pointerdown", event => { prepareAudio(); unlockMediaAudio(event.target !== elements.soundToggle); }, { capture: true });
	card.addEventListener("keydown", event => { prepareAudio(); unlockMediaAudio(event.target !== elements.soundToggle); }, { capture: true });
	const stylePicker = document.createElement("div");
	stylePicker.id = "design-popover";
	stylePicker.className = "frog-styles";
	stylePicker.hidden = true;
	stylePicker.setAttribute("role", "group");
	stylePicker.setAttribute("aria-label", "Estilo visual");
	[["uni", "UNI"], ["escolar", "Escolar"], ["futurista", "Futurista"]].forEach(([value, title]) => {
		const button = document.createElement("button");
		button.type = "button";
		button.textContent = title;
		button.dataset.style = value;
		button.addEventListener("click", () => { setStyle(value); closeDesign(); });
		stylePicker.append(button);
	});
	document.querySelector(".design-control").append(stylePicker);

	function setStyle(style) {
		card.dataset.style = style;
		stylePicker.querySelectorAll("button").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.style === style)));
	}

	let activeDesignToggle = elements.designToggle;
	function closeDesign(focus = true) {
		stylePicker.hidden = true;
		elements.designToggle.setAttribute("aria-expanded", "false");
		elements.fullscreenDesignToggle.setAttribute("aria-expanded", "false");
		if (focus && activeDesignToggle?.offsetParent !== null) activeDesignToggle.focus();
	}

	function toggleDesign(toggle) {
		activeDesignToggle = toggle;
		const open = stylePicker.hidden;
		stylePicker.hidden = !open;
		elements.designToggle.setAttribute("aria-expanded", "false");
		elements.fullscreenDesignToggle.setAttribute("aria-expanded", "false");
		toggle.setAttribute("aria-expanded", String(open));
		if (open) stylePicker.querySelector('[aria-pressed="true"]').focus();
	}
	setStyle("uni");
	elements.designToggle.addEventListener("click", () => toggleDesign(elements.designToggle));
	elements.fullscreenDesignToggle.addEventListener("click", () => toggleDesign(elements.fullscreenDesignToggle));
	document.addEventListener("click", event => {
		const clickedToggle = event.target === elements.designToggle || event.target === elements.fullscreenDesignToggle;
		if (!stylePicker.hidden && !stylePicker.contains(event.target) && !clickedToggle) closeDesign(false);
	});

	function closeGames(focus = false) {
		if (elements.gamesMenu.hidden) return;
		elements.gamesMenu.hidden = true;
		elements.gamesOpen.setAttribute("aria-expanded", "false");
		if (focus) elements.gamesOpen.focus();
	}
	elements.gamesOpen.addEventListener("click", () => { closeDesign(false); const open = elements.gamesMenu.hidden; elements.gamesMenu.hidden = !open; elements.gamesOpen.setAttribute("aria-expanded", String(open)); if (open) elements.gamesMenu.querySelector("nav a").focus(); });
	elements.gamesClose.addEventListener("click", () => closeGames(true));
	document.addEventListener("click", event => { if (!elements.gamesMenu.hidden && !elements.gamesMenu.contains(event.target) && event.target !== elements.gamesOpen) closeGames(); });

	elements.theme.addEventListener("click", () => { document.documentElement.classList.toggle("dark-mode"); localStorage.setItem("theme", document.documentElement.classList.contains("dark-mode") ? "dark" : "light"); setTheme(); });
	elements.guidedMode.addEventListener("click", () => { if (state.animating) return; state.mode = "guided"; state.playing = false; state.selected = null; elements.message.textContent = "Modo Guiado · carga la solución para comenzar."; render(); });
	elements.freeMode.addEventListener("click", () => { if (state.animating) return; state.playing = false; clearTimeout(state.timer); state.mode = "free"; state.freeState = initialState; state.freeMoves = 0; state.freeHistory = []; state.selected = null; elements.message.textContent = "Modo Libre · selecciona una rana."; render(); });
	elements.start.addEventListener("click", async () => { if (state.states.length === 1) { if (!await loadSolution()) return; } play(); });
	elements.pause.addEventListener("click", () => play());
	elements.next.addEventListener("click", () => animateTo(state.index + 1));
	elements.previous.addEventListener("click", () => animateTo(state.index - 1));
	elements.reset.addEventListener("click", reset);
	elements.speed.addEventListener("change", () => { if (!state.animating) elements.message.textContent = `Velocidad: ${elements.speed.options[elements.speed.selectedIndex].text}.`; });
	elements.soundToggle.addEventListener("click", () => {
		state.soundEnabled = !state.soundEnabled;
		elements.soundToggle.setAttribute("aria-pressed", String(state.soundEnabled));
		elements.soundToggle.textContent = state.soundEnabled ? "🔊 Sonido: Activado" : "🔇 Sonido: Desactivado";
		if (state.soundEnabled) prepareAudio();
		if (soundGain) {
			soundGain.gain.cancelScheduledValues(audioContext.currentTime);
			soundGain.gain.setTargetAtTime(state.soundEnabled ? 1 : 0, audioContext.currentTime, .005);
		}
		if (!state.soundEnabled) soundVoices.forEach(voice => voice.stop(audioContext.currentTime + .025));
		if (!state.soundEnabled) {
			Object.values(frogAudio).forEach(audio => { audio.pause(); audio.currentTime = 0; });
		} else {
			syncBackgroundAudio();
		}
		updateFullscreenHud();
	});
	window.addEventListener("pagehide", () => Object.values(frogAudio).forEach(audio => audio.pause()));
	function closeHistory() {
		elements.historyPanel.hidden = true;
		elements.historyBackdrop.hidden = true;
		elements.historyToggle.setAttribute("aria-expanded", "false");
		elements.fullscreenHistory.setAttribute("aria-expanded", "false");
	}

	function toggleHistory(toggle) {
		const open = elements.historyPanel.hidden;
		elements.historyPanel.hidden = !open;
		elements.historyBackdrop.hidden = !open;
		elements.historyToggle.setAttribute("aria-expanded", String(open));
		elements.fullscreenHistory.setAttribute("aria-expanded", String(open));
		toggle.setAttribute("aria-expanded", String(open));
		if (open) renderHistory();
	}

	elements.historyToggle.addEventListener("click", () => toggleHistory(elements.historyToggle));
	elements.fullscreenHistory.addEventListener("click", () => toggleHistory(elements.fullscreenHistory));
	elements.fullscreenSoundToggle.addEventListener("click", () => elements.soundToggle.click());
	elements.historyClose.addEventListener("click", closeHistory);
	elements.historyBackdrop.addEventListener("click", closeHistory);

	function syncFullscreen() {
		const full = document.fullscreenElement === card || card.classList.contains("fullscreen-fallback");
		document.body.classList.toggle("fullscreen-active", full);
		closeDesign(false);
		if (full) {
			elements.fullscreenHud.hidden = false;
			if (stylePicker.parentElement !== elements.fullscreenDesignToggle.parentElement) elements.fullscreenDesignToggle.parentElement.append(stylePicker);
		} else {
			elements.fullscreenHud.hidden = true;
			document.querySelector(".design-control").append(stylePicker);
			closeHistory(false);
		}
		elements.fullscreenOpen.setAttribute("aria-expanded", String(full));
		elements.fullscreenExit.hidden = !full;
		updateFullscreenHud();
	}

	elements.fullscreenOpen.addEventListener("click", async () => {
		if (state.animating) return;
		state.playing = false;
		clearTimeout(state.timer);
		closeDesign(false);
		try {
			if (!card.requestFullscreen) throw new Error("Fullscreen no disponible");
			await card.requestFullscreen();
		} catch {
			card.classList.add("fullscreen-fallback");
		}
		syncFullscreen();
		elements.fullscreenExitTop.focus();
	});

	async function exitFullscreen() {
		if (document.fullscreenElement === card) await document.exitFullscreen();
		card.classList.remove("fullscreen-fallback");
		syncFullscreen();
	}
	elements.fullscreenExit.addEventListener("click", exitFullscreen);
	elements.fullscreenExitTop.addEventListener("click", exitFullscreen);
	elements.fullscreenReset.addEventListener("click", reset);
	elements.fullscreenPrevious.addEventListener("click", () => animateTo(state.index - 1));
	elements.fullscreenNext.addEventListener("click", () => animateTo(state.index + 1));
	elements.fullscreenPlay.addEventListener("click", async () => { if (state.states.length === 1 && !state.playing && state.mode === "guided" && !await loadSolution()) return; play(); });
	document.addEventListener("fullscreenchange", syncFullscreen);
	document.addEventListener("keydown", event => {
		if (event.key === "Escape") {
			if (!elements.historyPanel.hidden) { closeHistory(); event.preventDefault(); }
			if (document.fullscreenElement === card || card.classList.contains("fullscreen-fallback")) exitFullscreen();
			if (!stylePicker.hidden) { closeDesign(); event.preventDefault(); }
			if (!elements.gamesMenu.hidden) { closeGames(true); event.preventDefault(); }
		}
	});
	fetch(`${BASE}/lab3`).then(response => { if (!response.ok) throw new Error(); state.connected = true; elements.server.textContent = "● Servidor Java conectado"; elements.server.className = "server-status online"; }).catch(() => { state.connected = false; elements.server.textContent = "● Servidor Java desconectado"; elements.server.className = "server-status offline"; });
	setTheme();
	render();
})();
