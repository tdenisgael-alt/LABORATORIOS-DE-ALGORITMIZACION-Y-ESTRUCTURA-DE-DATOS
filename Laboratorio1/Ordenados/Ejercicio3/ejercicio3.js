const URL_BASE = "http://localhost:8080/ordenado3";
const CLAVE_ESTADO = "arregloIniciado_ordenado3";

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

function esTotalVentasValido(valor) {
    if (valor === "") {
        return false;
    }

    const numero = Number(valor);
    return Number.isFinite(numero) && numero >= 0;
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
    ["formAlta", "formModificar", "formListarUno"].forEach(id => {
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

function mostrarModificar() {
    mostrarFormulario("formModificar");
}

function mostrarUno() {
    mostrarFormulario("formListarUno");
}

function cerrarVentana() {
    sessionStorage.removeItem(CLAVE_ESTADO);
    window.location.replace("../../laboratorio1.html");
}

async function darDeAltaVendedor() {
    const nombre = document.getElementById("nombreVendedor").value.trim();
    const totalVentas = document.getElementById("totalVentasVendedor").value.trim();

    if (nombre === "") {
        Swal.fire({
            icon: "warning",
            title: "Nombre inválido",
            text: "Ingrese el nombre del vendedor."
        });
        return;
    }

    if (!esTotalVentasValido(totalVentas)) {
        Swal.fire({
            icon: "warning",
            title: "Total de ventas inválido",
            text: "Ingrese un total de ventas igual o mayor que 0."
        });
        return;
    }

    try {
        const mensaje = await enviarFormulario("alta", { nombre, totalVentas });
        const mensajeMinuscula = mensaje.toLowerCase();

        if (mensajeMinuscula.includes("no hay espacio")) {
            Swal.fire({
                icon: "warning",
                title: "Arreglo lleno",
                text: "No hay espacio en el arreglo"
            });
            return;
        }

        const fueRegistrado = mensajeMinuscula.includes("vendedor registrado correctamente");
        Swal.fire({
            icon: fueRegistrado ? "success" : "warning",
            title: fueRegistrado ? "Registro exitoso" : "Aviso",
            text: mensaje
        });

        if (fueRegistrado) {
            document.getElementById("nombreVendedor").value = "";
            document.getElementById("totalVentasVendedor").value = "";
        }
    } catch (error) {
        console.error(error);
        mostrarErrorConexion();
    }
}

async function modificarTotalVentas() {
    const nombre = document.getElementById("nombreModificar").value.trim();
    const totalVentas = document.getElementById("totalVentasModificar").value.trim();

    if (nombre === "" || totalVentas === "") {
        Swal.fire({
            icon: "warning",
            title: "Campos incompletos",
            text: "Complete el nombre y el nuevo total de ventas."
        });
        return;
    }

    if (!esTotalVentasValido(totalVentas)) {
        Swal.fire({
            icon: "warning",
            title: "Total de ventas inválido",
            text: "Ingrese un total de ventas igual o mayor que 0."
        });
        return;
    }

    try {
        const mensaje = await enviarFormulario("modificar", { nombre, totalVentas });
        const fueModificado = mensaje.toLowerCase().includes("modificado correctamente");
        Swal.fire({
            icon: fueModificado ? "success" : "warning",
            title: fueModificado ? "Ventas actualizadas" : "Aviso",
            text: mensaje
        });

        if (fueModificado) {
            document.getElementById("nombreModificar").value = "";
            document.getElementById("totalVentasModificar").value = "";
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

async function listarUnVendedor() {
    const nombre = document.getElementById("nombreListar").value.trim();

    if (nombre === "") {
        Swal.fire({
            icon: "warning",
            title: "Nombre inválido",
            text: "Ingrese el nombre del vendedor."
        });
        return;
    }

    try {
        const mensaje = await enviarFormulario("listaruno", { nombre });
        const mensajeMinuscula = mensaje.toLowerCase();
        const noEncontrado = mensajeMinuscula.includes("no fue encontrado") ||
            mensajeMinuscula.includes("no hay vendedores") ||
            mensajeMinuscula.includes("primero debe iniciar");

        if (noEncontrado) {
            Swal.fire({
                icon: "warning",
                title: "Aviso",
                text: mensaje
            });
            return;
        }

        Swal.fire({
            icon: "success",
            title: "Datos del vendedor",
            html: `<pre class="seller-details">${escaparHTML(mensaje)}</pre>`
        });
        document.getElementById("nombreListar").value = "";
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
