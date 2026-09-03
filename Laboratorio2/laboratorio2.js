(() => {
    "use strict";

    const SERVER_BASE_URL = "http://localhost:8080";
    const METHOD_CONFIG = Object.freeze({
        Burbuja: Object.freeze({ backendValue: "burbuja", route: "/lab2/burbuja" }),
        "Burbuja con señal": Object.freeze({ backendValue: "burbuja-senal", route: "/lab2/burbuja-senal" }),
        Sacudida: Object.freeze({ backendValue: "sacudida", route: "/lab2/sacudida" }),
        Baraja: Object.freeze({ backendValue: "baraja", route: "/lab2/baraja" }),
        Selección: Object.freeze({ backendValue: "seleccion", route: "/lab2/seleccion" }),
        Shell: Object.freeze({ backendValue: "shell", route: "/lab2/shell" })
    });
    const SEARCH_TYPE_CONFIG = Object.freeze({
        number: "numero",
        index: "indice"
    });
    const CONNECTION_ERROR_MESSAGE =
        "No se pudo conectar con el servidor Java. Ejecuta Servidor.java en http://localhost:8080 e inténtalo de nuevo.";

    const methodButtons = document.querySelectorAll(".lab2-method-button");
    const methodsToggle = document.getElementById("lab2-methods-toggle");
    const methodsPanel = document.getElementById("lab2-methods-panel");
    const methodsBack = document.getElementById("lab2-methods-back");
    const menuMethod = document.getElementById("lab2-menu-method");
    const selectedMethod = document.getElementById("lab2-selected-method");
    const actionMethodLabel = document.getElementById("lab2-action-method-label");
    const actionMethod = document.getElementById("lab2-action-method");
    const arrayForm = document.getElementById("lab2-array-form");
    const arraySize = document.getElementById("lab2-array-size");
    const arrayValues = document.getElementById("lab2-array-values");
    const sizeToggleButton = document.getElementById("lab2-size-toggle-button");
    const sizeToggleIcon = document.getElementById("lab2-size-toggle-icon");
    const sizeToggleText = document.getElementById("lab2-size-toggle-text");
    const sortButton = document.getElementById("lab2-sort-button");
    const searchButton = document.getElementById("lab2-search-button");
    const searchClose = document.getElementById("lab2-search-close");
    const searchPanel = document.getElementById("lab2-search-panel");
    const resultsPanel = document.getElementById("lab2-results-panel");
    const searchForm = document.getElementById("lab2-search-form");
    const searchSubmitButton = searchForm.querySelector('button[type="submit"]');
    const searchModes = document.querySelectorAll('input[name="searchMode"]');
    const searchValueLabel = document.getElementById("lab2-search-value-label");
    const searchHelp = document.getElementById("lab2-search-help");
    const searchValue = document.getElementById("lab2-search-value");
    const unsortedResult = document.getElementById("lab2-unsorted-result");
    const sortedResult = document.getElementById("lab2-sorted-result");
    const unsortedPositionLabel = document.getElementById("lab2-unsorted-position-label");
    const sortedPositionLabel = document.getElementById("lab2-sorted-position-label");
    const unsortedPosition = document.getElementById("lab2-unsorted-position");
    const sortedPosition = document.getElementById("lab2-sorted-position");
    const searchMessage = document.getElementById("lab2-search-message");

    let selectedMethodName = "";
    let activeRequest = null;
    let arraySizeConfirmed = false;
    let requestBusy = false;

    class ConnectionError extends Error {
        constructor() {
            super(CONNECTION_ERROR_MESSAGE);
            this.name = "ConnectionError";
        }
    }

    function showSwalWarning(title, text) {
        if (typeof Swal !== "undefined") {
            Swal.fire({
                icon: "warning",
                title,
                text,
                confirmButtonText: "Aceptar"
            });
        } else {
            alert(`${title}: ${text}`);
        }
    }

    function showSwalError(title, text) {
        if (typeof Swal !== "undefined") {
            Swal.fire({
                icon: "error",
                title,
                text,
                confirmButtonText: "Aceptar"
            });
        } else {
            alert(`${title}: ${text}`);
        }
    }

    function showSwalSuccess(title, text) {
        if (typeof Swal !== "undefined") {
            Swal.fire({
                icon: "success",
                title,
                text,
                confirmButtonText: "Aceptar"
            });
        } else {
            alert(`${title}: ${text}`);
        }
    }

    function setMethodsPanelOpen(isOpen) {
        const methodName = selectedMethod.textContent.trim();

        methodsPanel.hidden = !isOpen;
        methodsToggle.setAttribute("aria-expanded", String(isOpen));
        methodsToggle.setAttribute(
            "aria-label",
            `${isOpen ? "Cerrar" : "Abrir"} métodos de ordenamiento. Método seleccionado: ${methodName}`
        );
    }

    function toggleMethodsPanel() {
        setMethodsPanelOpen(methodsPanel.hidden);
    }

    function selectMethod(event) {
        const selectedButton = event.currentTarget;

        methodButtons.forEach((button) => {
            const isSelected = button === selectedButton;
            button.classList.toggle("lab2-method-button--selected", isSelected);
            button.setAttribute("aria-pressed", String(isSelected));
        });

        selectedMethodName = selectedButton.dataset.method;
        selectedMethod.textContent = selectedMethodName;
        menuMethod.textContent = selectedMethodName;
        actionMethod.textContent = selectedMethodName;
        actionMethodLabel.hidden = false;
        setMethodsPanelOpen(false);
    }

    function getSelectedMethodConfig() {
        return METHOD_CONFIG[selectedMethodName] || null;
    }

    function getSearchMode() {
        const checkedMode = document.querySelector('input[name="searchMode"]:checked');
        return checkedMode ? checkedMode.value : "number";
    }

    function hideSearchValues() {
        unsortedPosition.textContent = "";
        sortedPosition.textContent = "";
        unsortedPosition.hidden = true;
        sortedPosition.hidden = true;
    }

    function setSearchMessage(message, state = "") {
        searchMessage.textContent = message;
        searchMessage.classList.remove("lab2-search-message--success", "lab2-search-message--error");

        if (state) {
            searchMessage.classList.add(`lab2-search-message--${state}`);
        }
    }

    function updateSearchMode() {
        const searchByIndex = getSearchMode() === "index";

        searchValueLabel.textContent = searchByIndex ? "Índice a buscar" : "Valor a buscar";
        searchValue.placeholder = searchByIndex ? "Ingrese el índice a buscar..." : "Ingrese el número a buscar...";
        searchHelp.textContent = searchByIndex
            ? "Los índices comienzan en 0. Se mostrará el valor de esa posición en ambos arreglos."
            : "Se buscará el número en el arreglo desordenado y en el ordenado.";
        unsortedPositionLabel.textContent = searchByIndex
            ? "Valor en el arreglo desordenado"
            : "Posición en el arreglo desordenado";
        sortedPositionLabel.textContent = searchByIndex
            ? "Valor en el arreglo ordenado"
            : "Posición en el arreglo ordenado";
        searchValue.value = "";
        searchValue.removeAttribute("aria-invalid");
        hideSearchValues();
        setSearchMessage("Aquí aparecerá el resultado de la búsqueda.");
    }

    function invalidArray(message, field) {
        field.setAttribute("aria-invalid", "true");
        return { message, field };
    }

    function readArraySize(showWarning = true) {
        arraySize.removeAttribute("aria-invalid");

        const sizeText = arraySize.value.trim();

        if (!/^\d+$/.test(sizeText) || Number(sizeText) < 1) {
            if (showWarning) {
                showSwalWarning("Tamaño inválido", "Indica un tamaño de arreglo válido mayor que cero.");
            }
            return invalidArray("Indica un tamaño de arreglo válido mayor que cero.", arraySize);
        }

        return { tam: Number(sizeText), error: false };
    }

    function readArrayInput(showWarning = true) {
        arrayValues.removeAttribute("aria-invalid");

        if (!arraySizeConfirmed) {
            const sizeInput = readArraySize(showWarning);
            if (sizeInput.message) {
                return sizeInput;
            }
            if (showWarning) {
                showSwalWarning("Tamaño no confirmado", "Primero debes ingresar y confirmar el tamaño del arreglo haciendo clic en Aceptar.");
            }
            return invalidArray("Debes confirmar el tamaño del arreglo antes de continuar.", arraySize);
        }

        const sizeInput = readArraySize(showWarning);

        if (sizeInput.message) {
            return sizeInput;
        }

        const rawValue = arrayValues.value.trim();

        if (!rawValue) {
            if (showWarning) {
                showSwalWarning("Arreglo vacío", "Ingresa los números enteros del arreglo.");
            }
            return invalidArray("Ingresa los números enteros del arreglo.", arrayValues);
        }

        const tokens = rawValue.split(",").map((value) => value.trim()).filter((v) => v.length > 0);

        if (tokens.length === 0) {
            if (showWarning) {
                showSwalWarning("Arreglo vacío", "Ingresa los números enteros del arreglo.");
            }
            return invalidArray("Ingresa los números enteros del arreglo.", arrayValues);
        }

        if (tokens.some((value) => !/^-?\d+$/.test(value))) {
            if (showWarning) {
                showSwalError(
                    "Formato no válido",
                    "El arreglo solo puede contener números enteros separados por comas."
                );
            }
            return invalidArray(
                "El arreglo solo puede contener números enteros separados por comas.",
                arrayValues
            );
        }

        const expectedSize = sizeInput.tam;

        if (tokens.length !== expectedSize) {
            if (showWarning) {
                showSwalWarning(
                    "Cantidad incorrecta",
                    `Debes ingresar exactamente ${expectedSize} números (has ingresado ${tokens.length}).`
                );
            }
            return invalidArray(`Debes ingresar exactamente ${expectedSize} números.`, arrayValues);
        }

        const numericValues = tokens.map(Number);

        if (numericValues.some((value) => !Number.isSafeInteger(value))) {
            if (showWarning) {
                showSwalError("Número no válido", "Todos los valores deben ser números enteros válidos.");
            }
            return invalidArray("Todos los valores deben ser números enteros válidos.", arrayValues);
        }

        const repeatedValue = numericValues.find(
            (value, index) => numericValues.indexOf(value) !== index
        );

        if (repeatedValue !== undefined) {
            if (showWarning) {
                showSwalError(
                    "Número duplicado",
                    `El número ${repeatedValue} se está repitiendo en el arreglo.`
                );
            }
            return invalidArray("No se permiten números repetidos.", arrayValues);
        }

        return {
            tam: expectedSize,
            elementos: tokens.join(","),
            error: false
        };
    }

    function renderArrayVisual(element, values, variant) {
        const list = Array.isArray(values) ? values : [];
        element.classList.add("lab2-result-placeholder--filled");
        const cells = list.map((value, index) => `
            <div class="lab2-array-item lab2-array-item--${variant}" aria-label="Valor ${value} en la posición ${index}">
                <span class="lab2-array-index">${index}</span>
                <span class="lab2-array-value">${value}</span>
            </div>
        `).join("");

        element.innerHTML = `
            <div class="lab2-array-visual">${cells || '<span class="lab2-result-empty">Sin datos</span>'}</div>
        `;
    }

    function showArrays(unsorted, sorted) {
        renderArrayVisual(unsortedResult, unsorted, "unsorted");
        renderArrayVisual(sortedResult, sorted, "sorted");
    }

    function showSortError(message) {
        unsortedResult.classList.remove("lab2-result-placeholder--filled");
        sortedResult.classList.remove("lab2-result-placeholder--filled");
        unsortedResult.innerHTML = `<span class="lab2-result-empty">${message}</span>`;
        sortedResult.innerHTML = '<span class="lab2-result-empty">No hay resultados para mostrar.</span>';
    }

    function focusInvalidField(validationResult) {
        if (validationResult.field) {
            validationResult.field.focus();
        }
    }

    function requireSelectedMethod() {
        const methodConfig = getSelectedMethodConfig();

        if (methodConfig) {
            return methodConfig;
        }

        showSwalWarning("Método no seleccionado", "Selecciona un método de ordenamiento antes de continuar.");
        setMethodsPanelOpen(true);
        methodsToggle.focus();
        return null;
    }

    function validateServerArrays(data) {
        if (!Array.isArray(data.original) || !Array.isArray(data.ordenado)) {
            throw new Error("El servidor no devolvió los arreglos original y ordenado esperados.");
        }
    }

    function updateArrayControls() {
        arraySize.disabled = requestBusy || arraySizeConfirmed;
        arrayValues.disabled = requestBusy || !arraySizeConfirmed;

        if (sizeToggleButton) {
            sizeToggleButton.disabled = requestBusy;
            if (arraySizeConfirmed) {
                sizeToggleButton.className = "lab2-button lab2-button--secondary";
                sizeToggleIcon.textContent = "✎";
                sizeToggleText.textContent = "Modificar arreglo";
            } else {
                sizeToggleButton.className = "lab2-button lab2-button--primary";
                sizeToggleIcon.textContent = "✓";
                sizeToggleText.textContent = "Aceptar";
            }
        }

        sortButton.disabled = requestBusy;
        searchButton.disabled = requestBusy;
        searchSubmitButton.disabled = requestBusy;
        searchValue.disabled = requestBusy;
        searchModes.forEach((mode) => {
            mode.disabled = requestBusy;
        });
        methodButtons.forEach((button) => {
            button.disabled = requestBusy;
        });
    }

    function setRequestBusy(isBusy) {
        requestBusy = isBusy;
        updateArrayControls();

        sortButton.setAttribute("aria-busy", String(isBusy));
        searchSubmitButton.setAttribute("aria-busy", String(isBusy));
    }

    function beginRequest(operation) {
        if (activeRequest) {
            return null;
        }

        const controller = new AbortController();
        activeRequest = { controller, operation };
        setRequestBusy(true);
        return controller;
    }

    function finishRequest(controller) {
        if (activeRequest && activeRequest.controller === controller) {
            activeRequest = null;
            setRequestBusy(false);
        }
    }

    function cancelActiveRequest(operation = "") {
        if (!activeRequest || (operation && activeRequest.operation !== operation)) {
            return;
        }

        const { controller } = activeRequest;
        activeRequest = null;
        controller.abort();
        setRequestBusy(false);
    }

    async function postForm(route, fields, signal) {
        const body = new URLSearchParams();

        Object.entries(fields).forEach(([name, value]) => {
            body.set(name, String(value));
        });

        let response;

        try {
            response = await fetch(`${SERVER_BASE_URL}${route}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body,
                signal
            });
        } catch (error) {
            if (error.name === "AbortError") {
                throw error;
            }

            throw new ConnectionError();
        }

        const responseText = await response.text();
        let data;

        try {
            data = JSON.parse(responseText);
        } catch (error) {
            const message = responseText.trim()
                || `El servidor devolvió una respuesta no válida (HTTP ${response.status}).`;
            throw new Error(message);
        }

        if (!response.ok || data.ok !== true) {
            throw new Error(data.mensaje || `El servidor rechazó la solicitud (HTTP ${response.status}).`);
        }

        return data;
    }

    async function executeSort() {
        const methodConfig = requireSelectedMethod();

        if (!methodConfig) {
            return;
        }

        const arrayInput = readArrayInput(true);

        if (arrayInput.message) {
            focusInvalidField(arrayInput);
            return;
        }

        const controller = beginRequest("sort");

        if (!controller) {
            return;
        }

        try {
            const data = await postForm(
                methodConfig.route,
                {
                    tam: arrayInput.tam,
                    elementos: arrayInput.elementos
                },
                controller.signal
            );

            validateServerArrays(data);
            showArrays(data.original, data.ordenado);
            resultsPanel.hidden = false;

            showSwalSuccess(
                "¡Arreglo ordenado!",
                `El arreglo fue ordenado exitosamente mediante el método ${selectedMethodName}.`
            );
        } catch (error) {
            if (error.name !== "AbortError") {
                showSortError(error.message || "No fue posible ordenar el arreglo.");
                showSwalError("Error al ordenar", error.message || "No fue posible ordenar el arreglo.");
            }
        } finally {
            finishRequest(controller);
        }
    }

    function readSearchValue(arrayLength) {
        searchValue.removeAttribute("aria-invalid");

        const searchText = searchValue.value.trim();

        if (!/^-?\d+$/.test(searchText) || !Number.isSafeInteger(Number(searchText))) {
            searchValue.setAttribute("aria-invalid", "true");
            showSwalWarning("Valor de búsqueda inválido", "Ingresa un número entero válido para realizar la búsqueda.");
            return {
                message: "Ingresa un número entero válido para realizar la búsqueda.",
                field: searchValue
            };
        }

        const value = Number(searchText);

        if (getSearchMode() === "index" && (value < 0 || value >= arrayLength)) {
            searchValue.setAttribute("aria-invalid", "true");
            showSwalWarning("Índice fuera de rango", `El índice debe estar entre 0 y ${arrayLength - 1}.`);
            return {
                message: `El índice debe estar entre 0 y ${arrayLength - 1}.`,
                field: searchValue
            };
        }

        return { value, error: false };
    }

    function showNumberSearchResponse(data) {
        if (data.encontrado) {
            unsortedPosition.textContent = String(data.indiceDesordenado);
            sortedPosition.textContent = String(data.indiceOrdenado);
            unsortedPosition.hidden = false;
            sortedPosition.hidden = false;
            setSearchMessage(data.mensaje || "Número encontrado.", "success");
            return;
        }

        hideSearchValues();
        setSearchMessage(data.mensaje || "Número no encontrado.", "error");
    }

    function showIndexSearchResponse(data) {
        unsortedPosition.textContent = String(data.numeroDesordenado);
        sortedPosition.textContent = String(data.numeroOrdenado);
        unsortedPosition.hidden = false;
        sortedPosition.hidden = false;
        setSearchMessage(data.mensaje || "Valores encontrados.", "success");
    }

    async function executeSearch(event) {
        event.preventDefault();
        hideSearchValues();

        const methodConfig = requireSelectedMethod();

        if (!methodConfig) {
            return;
        }

        const arrayInput = readArrayInput(true);

        if (arrayInput.message) {
            setSearchMessage(arrayInput.message, "error");
            focusInvalidField(arrayInput);
            return;
        }

        const searchInput = readSearchValue(arrayInput.tam);

        if (searchInput.message) {
            setSearchMessage(searchInput.message, "error");
            focusInvalidField(searchInput);
            return;
        }

        const searchMode = getSearchMode();
        const controller = beginRequest("search");

        if (!controller) {
            return;
        }

        setSearchMessage("Realizando la búsqueda en Java...");

        try {
            const data = await postForm(
                "/lab2/binaria",
                {
                    tam: arrayInput.tam,
                    elementos: arrayInput.elementos,
                    metodo: methodConfig.backendValue,
                    tipo: SEARCH_TYPE_CONFIG[searchMode],
                    valor: searchInput.value
                },
                controller.signal
            );

            validateServerArrays(data);
            showArrays(data.original, data.ordenado);
            resultsPanel.hidden = false;

            if (data.tipoBusqueda === "indice") {
                showIndexSearchResponse(data);
            } else {
                showNumberSearchResponse(data);
            }
        } catch (error) {
            if (error.name !== "AbortError") {
                hideSearchValues();
                setSearchMessage(error.message || "No fue posible realizar la búsqueda.", "error");
                showSwalError("Error en la búsqueda", error.message || "No fue posible realizar la búsqueda.");
            }
        } finally {
            finishRequest(controller);
        }
    }

    function resetResults() {
        resultsPanel.hidden = true;
        unsortedResult.classList.remove("lab2-result-placeholder--filled");
        sortedResult.classList.remove("lab2-result-placeholder--filled");
        unsortedResult.innerHTML = '<span class="lab2-result-empty">Aquí aparecerá el resultado</span>';
        sortedResult.innerHTML = '<span class="lab2-result-empty">Aquí aparecerá el resultado</span>';
        hideSearchValues();
        arraySize.removeAttribute("aria-invalid");
        arrayValues.removeAttribute("aria-invalid");
        searchValue.removeAttribute("aria-invalid");
        setSearchMessage("Aquí aparecerá el resultado de la búsqueda.");
    }

    function confirmArraySize() {
        const sizeInput = readArraySize(true);

        if (sizeInput.message) {
            focusInvalidField(sizeInput);
            return;
        }

        arraySizeConfirmed = true;
        resetResults();
        updateArrayControls();
        arrayValues.focus();
    }

    function prepareArrayModification() {
        cancelActiveRequest();
        arraySizeConfirmed = false;
        resetResults();
        setMethodsPanelOpen(false);
        searchPanel.hidden = true;
        searchButton.setAttribute("aria-expanded", "false");
        searchValue.value = "";
        updateArrayControls();
        arraySize.focus();
    }

    function handleSizeToggle() {
        if (!arraySizeConfirmed) {
            confirmArraySize();
        } else {
            prepareArrayModification();
        }
    }

    function handleSearchButtonClick() {
        const arrayInput = readArrayInput(true);
        if (arrayInput.message) {
            focusInvalidField(arrayInput);
            return;
        }

        if (searchPanel.hidden) {
            showSearchPanel();
        } else {
            hideSearchPanel();
        }
    }

    function showSearchPanel() {
        searchPanel.hidden = false;
        searchButton.setAttribute("aria-expanded", "true");
        searchValue.focus();
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        searchPanel.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
    }

    function hideSearchPanel() {
        cancelActiveRequest("search");
        searchPanel.hidden = true;
        searchButton.setAttribute("aria-expanded", "false");
        searchButton.focus();
    }

    methodButtons.forEach((button) => {
        button.addEventListener("click", selectMethod);
    });

    methodsToggle.addEventListener("click", toggleMethodsPanel);
    methodsBack.addEventListener("click", () => {
        setMethodsPanelOpen(false);
        methodsToggle.focus();
    });

    document.addEventListener("click", (event) => {
        if (methodsPanel.hidden) {
            return;
        }

        if (!methodsPanel.contains(event.target) && !methodsToggle.contains(event.target)) {
            setMethodsPanelOpen(false);
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !methodsPanel.hidden) {
            setMethodsPanelOpen(false);
            methodsToggle.focus();
        }
    });

    arrayForm.addEventListener("submit", (event) => {
        event.preventDefault();
    });

    sizeToggleButton.addEventListener("click", handleSizeToggle);
    arraySize.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            if (!arraySizeConfirmed) {
                confirmArraySize();
            }
        }
    });
    sortButton.addEventListener("click", executeSort);
    searchButton.addEventListener("click", handleSearchButtonClick);
    searchClose.addEventListener("click", hideSearchPanel);
    searchForm.addEventListener("submit", executeSearch);
    searchModes.forEach((mode) => {
        mode.addEventListener("change", updateSearchMode);
    });

    updateSearchMode();
    resetResults();
    updateArrayControls();
    setMethodsPanelOpen(false);
    searchPanel.hidden = true;
    searchButton.setAttribute("aria-expanded", "false");
    if (typeof window.actualizarBotonTheme === "function") {
        window.actualizarBotonTheme();
    }
})();
