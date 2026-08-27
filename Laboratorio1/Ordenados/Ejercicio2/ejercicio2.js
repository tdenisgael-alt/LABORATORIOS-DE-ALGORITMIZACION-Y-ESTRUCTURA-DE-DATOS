const URL_BASE = "http://localhost:8080/ordenado2";
const CLAVE_ESTADO = "arregloIniciado_ordenado2";

async function enviarFormulario(ruta, datos) {
    const respuesta = await fetch(`${URL_BASE}/${ruta}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams(datos).toString()
    });

    const mensaje = await respuesta.text();

    if (!respuesta.ok) {
        throw new Error(mensaje || "El servidor no pudo procesar la solicitud.");
    }

    return mensaje;
}

function mostrarErrorConexion() {
    Swal.fire({
        icon: "error",
        title: "Error de conexión",
        text: "No se pudo conectar con el servidor Java.",
        confirmButtonText: "OK"
    });
}

function esEnteroPositivo(valor) {
    if (!/^\d+$/.test(valor)) {
        return false;
    }

    const numero = Number(valor);
    return numero > 0 && numero <= 2147483647;
}

function esNumeroValido(valor, minimo, incluirMinimo) {
    if (valor === "") {
        return false;
    }

    const numero = Number(valor);
    if (!Number.isFinite(numero)) {
        return false;
    }

    return incluirMinimo ? numero >= minimo : numero > minimo;
}

async function iniciarArreglo() {
    const tam = document.getElementById("tamArreglo").value.trim();

    if (!esEnteroPositivo(tam)) {
        Swal.fire({
            icon: "warning",
            title: "Tamaño inválido",
            text: "Ingrese un tamaño entero mayor que 0."
        });
        return;
    }

    try {
        const mensaje = await enviarFormulario("iniciar", { tam });
        sessionStorage.setItem(CLAVE_ESTADO, "true");
        document.getElementById("configuracionArreglo").style.display = "none";
        document.getElementById("menuOpciones").style.display = "block";

        Swal.fire({
            icon: "success",
            title: "Ejercicio iniciado",
            text: mensaje
        });
    } catch (error) {
        console.error(error);
        mostrarErrorConexion();
    }
}

function ocultarFormularios() {
    ["formAlta", "formBaja", "formModificar", "formListarUno"].forEach(id => {
        const formulario = document.getElementById(id);
        if (formulario) {
            formulario.style.display = "none";
        }
    });
}

function mostrarFormulario(id) {
    ocultarFormularios();
    document.getElementById(id).style.display = "block";
}

function mostrarAlta() {
    mostrarFormulario("formAlta");
}

function mostrarBaja() {
    mostrarFormulario("formBaja");
}

function mostrarModificar() {
    mostrarFormulario("formModificar");
}

function mostrarUno() {
    mostrarFormulario("formListarUno");
}

function listarTodos() {
    ocultarFormularios();
    window.location.replace("listartodos.html");
}

function cerrarVentana() {
    sessionStorage.removeItem(CLAVE_ESTADO);
    window.location.replace("../../laboratorio1.html");
}

async function darDeAltaDepartamento() {
    const ubicacion = document.getElementById("ubicacionDepartamento").value.trim();
    const extension = document.getElementById("extensionDepartamento").value.trim();
    const precio = document.getElementById("precioDepartamento").value.trim();
    const numeroApartamento = document.getElementById("numeroApartamento").value.trim();
    const nombrePersona = document.getElementById("nombrePersona").value.trim();

    if (ubicacion === "" || extension === "" || precio === "" || numeroApartamento === "" || nombrePersona === "") {
        Swal.fire({
            icon: "warning",
            title: "Campos incompletos",
            text: "Por favor, complete todos los campos."
        });
        return;
    }

    if (!esNumeroValido(extension, 0, false)) {
        Swal.fire({
            icon: "warning",
            title: "Extensión inválida",
            text: "Ingrese una extensión mayor que 0."
        });
        return;
    }

    if (!esNumeroValido(precio, 0, true)) {
        Swal.fire({
            icon: "warning",
            title: "Precio inválido",
            text: "Ingrese un precio igual o mayor que 0."
        });
        return;
    }

    if (!esEnteroPositivo(numeroApartamento)) {
        Swal.fire({
            icon: "warning",
            title: "Número inválido",
            text: "Ingrese un número de apartamento entero mayor que 0."
        });
        return;
    }

    try {
        const mensaje = await enviarFormulario("alta", {
            ubicacion,
            extension,
            precio,
            numeroApartamento,
            nombrePersona
        });
        const mensajeMinuscula = mensaje.toLowerCase();

        if (mensajeMinuscula.includes("no hay espacio")) {
            Swal.fire({
                icon: "warning",
                title: "Arreglo lleno",
                text: "No hay espacio en el arreglo"
            });
            return;
        }

        const fueRegistrado = mensajeMinuscula.includes("departamento registrado correctamente");
        Swal.fire({
            icon: fueRegistrado ? "success" : "warning",
            title: fueRegistrado ? "Registro exitoso" : "Aviso",
            text: mensaje
        });

        if (fueRegistrado) {
            document.getElementById("ubicacionDepartamento").value = "";
            document.getElementById("extensionDepartamento").value = "";
            document.getElementById("precioDepartamento").value = "";
            document.getElementById("numeroApartamento").value = "";
            document.getElementById("nombrePersona").value = "";
        }
    } catch (error) {
        console.error(error);
        mostrarErrorConexion();
    }
}

async function darDeBajaDepartamento() {
    const numeroApartamento = document.getElementById("numeroApartamentoBaja").value.trim();

    if (!esEnteroPositivo(numeroApartamento)) {
        Swal.fire({
            icon: "warning",
            title: "Número inválido",
            text: "Ingrese un número de apartamento entero mayor que 0."
        });
        return;
    }

    try {
        const mensaje = await enviarFormulario("baja", { numeroApartamento });
        const fueLiberado = mensaje.toLowerCase().includes("liberado correctamente");
        Swal.fire({
            icon: fueLiberado ? "success" : "warning",
            title: fueLiberado ? "Departamento liberado" : "Aviso",
            text: mensaje
        });

        if (fueLiberado) {
            document.getElementById("numeroApartamentoBaja").value = "";
        }
    } catch (error) {
        console.error(error);
        mostrarErrorConexion();
    }
}

async function modificarPrecioDepartamento() {
    const numeroApartamento = document.getElementById("numeroApartamentoModificar").value.trim();
    const precio = document.getElementById("precioModificar").value.trim();

    if (!esEnteroPositivo(numeroApartamento)) {
        Swal.fire({
            icon: "warning",
            title: "Número inválido",
            text: "Ingrese un número de apartamento entero mayor que 0."
        });
        return;
    }

    if (!esNumeroValido(precio, 0, true)) {
        Swal.fire({
            icon: "warning",
            title: "Precio inválido",
            text: "Ingrese un precio igual o mayor que 0."
        });
        return;
    }

    try {
        const mensaje = await enviarFormulario("modificar", { numeroApartamento, precio });
        const fueModificado = mensaje.toLowerCase().includes("precio modificado correctamente");
        Swal.fire({
            icon: fueModificado ? "success" : "warning",
            title: fueModificado ? "Precio actualizado" : "Aviso",
            text: mensaje
        });

        if (fueModificado) {
            document.getElementById("numeroApartamentoModificar").value = "";
            document.getElementById("precioModificar").value = "";
        }
    } catch (error) {
        console.error(error);
        mostrarErrorConexion();
    }
}

function escaparHTML(texto) {
    return texto
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function listarUnDepartamento() {
    const numeroApartamento = document.getElementById("numeroApartamentoListar").value.trim();

    if (!esEnteroPositivo(numeroApartamento)) {
        Swal.fire({
            icon: "warning",
            title: "Número inválido",
            text: "Ingrese un número de apartamento entero mayor que 0."
        });
        return;
    }

    try {
        const mensaje = await enviarFormulario("listaruno", { numeroApartamento });
        const mensajeMinuscula = mensaje.toLowerCase();
        const noEncontrado = mensajeMinuscula.includes("no fue encontrado") ||
            mensajeMinuscula.includes("no hay departamentos") ||
            mensajeMinuscula.includes("primero debe iniciar");

        if (noEncontrado) {
            Swal.fire({
                icon: "warning",
                title: "Aviso",
                text: mensaje
            });
            return;
        }

        const mensajeFormateado = mensaje
            .replace(/^Ubicacion:/m, "Ubicación:")
            .replace(/^Extension:/m, "Extensión:")
            .replace(/ m2\b/g, " m²")
            .replace(/^Numero de apartamento:/m, "Número de apartamento:");

        Swal.fire({
            icon: "success",
            title: "Datos del departamento",
            html: `<pre class="department-details">${escaparHTML(mensajeFormateado)}</pre>`
        });
        document.getElementById("numeroApartamentoListar").value = "";
    } catch (error) {
        console.error(error);
        mostrarErrorConexion();
    }
}

function verificarEstadoArreglo() {
    if (sessionStorage.getItem(CLAVE_ESTADO) === "true") {
        document.getElementById("configuracionArreglo").style.display = "none";
        document.getElementById("menuOpciones").style.display = "block";
    }
}

function toggleTheme() {
    const esOscuro = document.documentElement.classList.toggle("dark-mode");
    localStorage.setItem("theme", esOscuro ? "dark" : "light");
    actualizarBotonTheme();
}

function actualizarBotonTheme() {
    const boton = document.getElementById("btnThemeToggle");
    if (!boton) {
        return;
    }

    const esOscuro = document.documentElement.classList.contains("dark-mode");
    boton.innerHTML = esOscuro ? "☀️ Modo Claro" : "🌙 Modo Oscuro";
}

function prepararPagina() {
    verificarEstadoArreglo();
    actualizarBotonTheme();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", prepararPagina);
} else {
    prepararPagina();
}
