const URL_BASE = "http://localhost:8080/ordenado1";
const CLAVE_ESTADO = "arregloIniciado_ordenado1";

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

function esEnteroValido(valor, minimo) {
    if (!/^\d+$/.test(valor)) {
        return false;
    }

    const numero = Number(valor);
    return numero >= minimo && numero <= 2147483647;
}

async function iniciarArreglo() {
    const tam = document.getElementById("tamArreglo").value.trim();

    if (!esEnteroValido(tam, 1)) {
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

async function darDeAltaEmpleado() {
    const nombre = document.getElementById("nombreEmpleado").value.trim();
    const direccion = document.getElementById("direccionEmpleado").value.trim();
    const edad = document.getElementById("edadEmpleado").value.trim();
    const sexo = document.getElementById("sexoEmpleado").value;
    const antiguedad = document.getElementById("antiguedadEmpleado").value.trim();

    if (nombre === "" || direccion === "" || edad === "" || sexo === "" || antiguedad === "") {
        Swal.fire({
            icon: "warning",
            title: "Campos incompletos",
            text: "Por favor, complete todos los campos."
        });
        return;
    }

    if (!esEnteroValido(edad, 1)) {
        Swal.fire({
            icon: "warning",
            title: "Edad inválida",
            text: "Ingrese una edad entera mayor que 0."
        });
        return;
    }

    if (!esEnteroValido(antiguedad, 0)) {
        Swal.fire({
            icon: "warning",
            title: "Antigüedad inválida",
            text: "Los años de antigüedad deben ser un entero igual o mayor que 0."
        });
        return;
    }

    try {
        const mensaje = await enviarFormulario("alta", {
            nombre,
            direccion,
            edad,
            sexo,
            antiguedad
        });

        const fueRegistrado = mensaje.toLowerCase().includes("registrado correctamente");
        Swal.fire({
            icon: fueRegistrado ? "success" : "warning",
            title: fueRegistrado ? "Registro exitoso" : "Aviso",
            text: mensaje
        });

        if (fueRegistrado) {
            document.getElementById("nombreEmpleado").value = "";
            document.getElementById("direccionEmpleado").value = "";
            document.getElementById("edadEmpleado").value = "";
            document.getElementById("sexoEmpleado").value = "M";
            document.getElementById("antiguedadEmpleado").value = "";
        }
    } catch (error) {
        console.error(error);
        mostrarErrorConexion();
    }
}

async function darDeBajaEmpleado() {
    const nombre = document.getElementById("nombreBaja").value.trim();

    if (nombre === "") {
        Swal.fire({
            icon: "warning",
            title: "Campo vacío",
            text: "Ingrese el nombre del empleado."
        });
        return;
    }

    try {
        const mensaje = await enviarFormulario("baja", { nombre });
        const fueEliminado = mensaje.toLowerCase().includes("eliminado correctamente");
        Swal.fire({
            icon: fueEliminado ? "success" : "warning",
            title: fueEliminado ? "Empleado eliminado" : "Aviso",
            text: mensaje
        });

        if (fueEliminado) {
            document.getElementById("nombreBaja").value = "";
        }
    } catch (error) {
        console.error(error);
        mostrarErrorConexion();
    }
}

async function modificarAntiguedadEmpleado() {
    const nombre = document.getElementById("nombreModificar").value.trim();
    const antiguedad = document.getElementById("antiguedadModificar").value.trim();

    if (nombre === "" || antiguedad === "") {
        Swal.fire({
            icon: "warning",
            title: "Campos incompletos",
            text: "Complete el nombre y los nuevos años de antigüedad."
        });
        return;
    }

    if (!esEnteroValido(antiguedad, 0)) {
        Swal.fire({
            icon: "warning",
            title: "Antigüedad inválida",
            text: "Los años de antigüedad deben ser un entero igual o mayor que 0."
        });
        return;
    }

    try {
        const mensaje = await enviarFormulario("modificar", { nombre, antiguedad });
        const fueModificado = mensaje.toLowerCase().includes("modificados correctamente");
        Swal.fire({
            icon: fueModificado ? "success" : "warning",
            title: fueModificado ? "Antigüedad actualizada" : "Aviso",
            text: mensaje
        });

        if (fueModificado) {
            document.getElementById("nombreModificar").value = "";
            document.getElementById("antiguedadModificar").value = "";
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

async function listarUnEmpleado() {
    const nombre = document.getElementById("nombreListar").value.trim();

    if (nombre === "") {
        Swal.fire({
            icon: "warning",
            title: "Campo vacío",
            text: "Ingrese el nombre del empleado."
        });
        return;
    }

    try {
        const mensaje = await enviarFormulario("listaruno", { nombre });
        const noEncontrado = mensaje.toLowerCase().includes("no fue encontrado") ||
            mensaje.toLowerCase().includes("no hay empleados") ||
            mensaje.toLowerCase().includes("primero debe iniciar");

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
            title: "Datos del empleado",
            html: `<pre class="employee-details">${escaparHTML(mensaje)}</pre>`
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
