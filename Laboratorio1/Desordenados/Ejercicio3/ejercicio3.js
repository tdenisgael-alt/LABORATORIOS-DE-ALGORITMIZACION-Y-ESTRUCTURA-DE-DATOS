// -----------------------------------------------------
// INICIAR EL ARREGLO
// -----------------------------------------------------

function iniciarArreglo() {

    // Obtener el tamaño escrito por el usuario
    const tam = document.getElementById("tamArreglo").value;

    // Validar que sea mayor que cero
    if (tam === "" || parseInt(tam) <= 0) {
        Swal.fire({
            icon: "warning",
            title: "Tamaño inválido",
            text: "Ingrese un tamaño mayor que 0."
        });
        return;
    }

    // Preparar el dato para Java
    const datos = "tam=" + encodeURIComponent(tam);

    // Enviar el tamaño al servidor Java
    fetch(
        "http://localhost:8080/desordenado3/iniciar",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: datos
        }
    )
    .then(async respuesta => {
        const mensaje = await respuesta.text();

        if (respuesta.ok) {
            sessionStorage.setItem("arregloIniciado_desordenado3", "true");

            Swal.fire({
                icon: "success",
                title: "Ejercicio iniciado",
                text: mensaje
            });

            // Ocultar la configuración
            document.getElementById("configuracionArreglo").style.display = "none";

            // Mostrar el menú
            document.getElementById("menuOpciones").style.display = "block";
        } else {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: mensaje
            });
        }
    })
    .catch(error => {
        console.error(error);
        Swal.fire({
            icon: "error",
            title: "Error de conexión",
            text: "No se pudo conectar con el servidor Java."
        });
    });
}

// -----------------------------------------------------
// MANEJO DE VISTAS Y FORMULARIOS
// -----------------------------------------------------

function ocultarFormularios() {
    const formAlta = document.getElementById("formAlta");
    const formBaja = document.getElementById("formBaja");
    const formModificar = document.getElementById("formModificar");
    const formListarUno = document.getElementById("formListarUno");

    if (formAlta) formAlta.style.display = "none";
    if (formBaja) formBaja.style.display = "none";
    if (formModificar) formModificar.style.display = "none";
    if (formListarUno) formListarUno.style.display = "none";
}

function mostrarAlta() {
    ocultarFormularios();
    document.getElementById("formAlta").style.display = "block";
}

function mostrarBaja() {
    ocultarFormularios();
    document.getElementById("formBaja").style.display = "block";
}

function mostrarModificar() {
    ocultarFormularios();
    document.getElementById("formModificar").style.display = "block";
}

function mostrarUno() {
    ocultarFormularios();
    document.getElementById("formListarUno").style.display = "block";
}

function listarVarones() {
    ocultarFormularios();
    window.location.replace("listarvarones.html");
}

function listarTodos() {
    ocultarFormularios();
    window.location.replace("listartodos.html");
}

function cerrarVentana() {
    sessionStorage.removeItem("arregloIniciado_desordenado3");
    window.location.replace("../../laboratorio1.html");
}

// -----------------------------------------------------
// 1. DAR DE ALTA EMPLEADO
// -----------------------------------------------------

function darDeAltaEmpleado() {
    // Obtener los datos del formulario
    const nombre = document.getElementById("nombreEmpleado").value.trim();
    const sexo = document.getElementById("sexoEmpleado").value;
    const edad = document.getElementById("edadEmpleado").value.trim();

    // Comprobar que todos los campos estén llenos
    if (nombre === "" || sexo === "" || edad === "") {
        Swal.fire({
            icon: "warning",
            title: "Campos incompletos",
            text: "Por favor, complete todos los campos."
        });
        return;
    }

    // Validar edad numérica válida
    if (parseInt(edad) <= 0 || isNaN(parseInt(edad))) {
        Swal.fire({
            icon: "warning",
            title: "Dato inválido",
            text: "Por favor, ingrese una edad válida mayor que 0."
        });
        return;
    }

    // Preparar los datos para enviarlos a Java
    const datos =
        "nombre=" + encodeURIComponent(nombre) +
        "&sexo=" + encodeURIComponent(sexo) +
        "&edad=" + encodeURIComponent(edad);

    // Enviar los datos al servidor Java
    fetch(
        "http://localhost:8080/desordenado3/alta",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: datos
        }
    )
    .then(async respuesta => {
        const mensaje = await respuesta.text();

        if (respuesta.ok) {
            // Si el arreglo está lleno
            if (
                mensaje.toLowerCase().includes("no hay espacio") ||
                mensaje.toLowerCase().includes("lleno")
            ) {
                Swal.fire({
                    icon: "warning",
                    title: "Arreglo lleno",
                    text: mensaje
                });
                return;
            }

            // Registro exitoso
            Swal.fire({
                icon: "success",
                title: "Registro exitoso",
                text: mensaje
            });

            // Limpiar campos
            document.getElementById("nombreEmpleado").value = "";
            document.getElementById("sexoEmpleado").value = "M";
            document.getElementById("edadEmpleado").value = "";

        } else {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: mensaje
            });
        }
    })
    .catch(error => {
        console.error(error);
        Swal.fire({
            icon: "error",
            title: "Error de conexión",
            text: "No se pudo conectar con el servidor Java."
        });
    });
}

// -----------------------------------------------------
// 2. DAR DE BAJA EMPLEADO
// -----------------------------------------------------

function darDeBajaEmpleado() {
    const nombre = document.getElementById("nombreBaja").value.trim();

    if (nombre === "") {
        Swal.fire({
            icon: "warning",
            title: "Campo vacío",
            text: "Ingrese el nombre del empleado."
        });
        return;
    }

    const datos = "nombre=" + encodeURIComponent(nombre);

    fetch(
        "http://localhost:8080/desordenado3/baja",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: datos
        }
    )
    .then(async respuesta => {
        const mensaje = await respuesta.text();

        if (respuesta.ok) {
            if (
                mensaje.toLowerCase().includes("eliminado") ||
                mensaje.toLowerCase().includes("correctamente")
            ) {
                Swal.fire({
                    icon: "success",
                    title: "Empleado eliminado",
                    text: mensaje
                });

                document.getElementById("nombreBaja").value = "";
            } else {
                Swal.fire({
                    icon: "warning",
                    title: "Aviso",
                    text: mensaje
                });
            }
        } else {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: mensaje
            });
        }
    })
    .catch(error => {
        console.error(error);
        Swal.fire({
            icon: "error",
            title: "Error de conexión",
            text: "No se pudo conectar con el servidor Java."
        });
    });
}

// -----------------------------------------------------
// 3. ACTUALIZAR EDAD
// -----------------------------------------------------

function modificarEdadEmpleado() {
    const nombre = document.getElementById("nombreModificar").value.trim();
    const edad = document.getElementById("edadModificar").value.trim();

    // Validar que se hayan llenado los campos
    if (nombre === "" || edad === "") {
        Swal.fire({
            icon: "warning",
            title: "Campos incompletos",
            text: "Por favor, complete el nombre y la nueva edad."
        });
        return;
    }

    // Validar edad numérica válida
    if (parseInt(edad) <= 0 || isNaN(parseInt(edad))) {
        Swal.fire({
            icon: "warning",
            title: "Dato inválido",
            text: "Por favor, ingrese una edad válida mayor que 0."
        });
        return;
    }

    // Preparar los datos para enviarlos a Java
    const datos =
        "nombre=" + encodeURIComponent(nombre) +
        "&edad=" + encodeURIComponent(edad);

    // Enviar al servidor Java
    fetch(
        "http://localhost:8080/desordenado3/modificar",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: datos
        }
    )
    .then(async respuesta => {
        const mensaje = await respuesta.text();

        if (respuesta.ok) {
            if (
                mensaje.toLowerCase().includes("modificado") ||
                mensaje.toLowerCase().includes("correctamente") ||
                mensaje.toLowerCase().includes("actualizado")
            ) {
                Swal.fire({
                    icon: "success",
                    title: "Edad actualizada",
                    text: mensaje
                });

                // Limpiar campos
                document.getElementById("nombreModificar").value = "";
                document.getElementById("edadModificar").value = "";
            } else {
                Swal.fire({
                    icon: "warning",
                    title: "Empleado no encontrado",
                    text: mensaje
                });
            }
        } else {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: mensaje
            });
        }
    })
    .catch(error => {
        console.error(error);
        Swal.fire({
            icon: "error",
            title: "Error de conexión",
            text: "No se pudo conectar con el servidor Java."
        });
    });
}

// -----------------------------------------------------
// 5. LISTAR UN EMPLEADO
// -----------------------------------------------------

function listarUnEmpleado() {
    const nombre = document.getElementById("nombreListar").value.trim();

    if (nombre === "") {
        Swal.fire({
            icon: "warning",
            title: "Campo vacío",
            text: "Ingrese el nombre del empleado."
        });
        return;
    }

    const datos = "nombre=" + encodeURIComponent(nombre);

    fetch(
        "http://localhost:8080/desordenado3/listaruno",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: datos
        }
    )
    .then(async respuesta => {
        const mensaje = await respuesta.text();

        if (!respuesta.ok) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: mensaje
            });
            return;
        }

        // Comprobar si Java encontró al empleado
        if (
            mensaje.toLowerCase().includes("no fue encontrado") ||
            mensaje.toLowerCase().includes("no encontrado") ||
            mensaje.toLowerCase().includes("no existe")
        ) {
            Swal.fire({
                icon: "warning",
                title: "Empleado no encontrado",
                text: mensaje
            });
        } else {
            let mensajeFormateado = "";

            // Si viene con formato pipe: Nombre|Sexo|Edad
            if (mensaje.includes("|")) {
                const partes = mensaje.trim().split("|");
                const nom = partes[0] ? partes[0].trim() : "";
                let sex = partes[1] ? partes[1].trim() : "";
                if (sex.toUpperCase() === "M" || sex.toLowerCase() === "masculino") sex = "Masculino";
                else if (sex.toUpperCase() === "F" || sex.toLowerCase() === "femenino") sex = "Femenino";
                const ed = partes[2] ? partes[2].trim() : "";
                mensajeFormateado = `Nombre: ${nom}\nSexo: ${sex}\nEdad: ${ed}`;
            } else {
                // Formatear sexo para mostrar Masculino/Femenino al usuario
                mensajeFormateado = mensaje
                    .replace(/Sexo:\s*M\b/gi, "Sexo: Masculino")
                    .replace(/Sexo:\s*F\b/gi, "Sexo: Femenino");
            }

            Swal.fire({
                icon: "success",
                title: "Datos del empleado",
                html: "<pre style='text-align:left; font-size:1rem; font-family: inherit;'>" +
                      mensajeFormateado +
                      "</pre>"
            });

            document.getElementById("nombreListar").value = "";
        }
    })
    .catch(error => {
        console.error(error);
        Swal.fire({
            icon: "error",
            title: "Error de conexión",
            text: "No se pudo conectar con el servidor Java."
        });
    });
}

// -----------------------------------------------------
// VERIFICAR ESTADO AL CARGAR LA PÁGINA
// -----------------------------------------------------

function verificarEstadoArreglo() {
    if (sessionStorage.getItem("arregloIniciado_desordenado3") === "true") {
        const config = document.getElementById("configuracionArreglo");
        const menu = document.getElementById("menuOpciones");
        if (config) config.style.display = "none";
        if (menu) menu.style.display = "block";
    }
}

// -----------------------------------------------------
// MODO OSCURO
// -----------------------------------------------------
function toggleTheme() {
    const isDark = document.documentElement.classList.toggle("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    actualizarBotonTheme();
}

function actualizarBotonTheme() {
    const btn = document.getElementById("btnThemeToggle");
    if (!btn) return;
    const isDark = document.documentElement.classList.contains("dark-mode");
    btn.innerHTML = isDark ? "☀️ Modo Claro" : "🌙 Modo Oscuro";
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        verificarEstadoArreglo();
        actualizarBotonTheme();
    });
} else {
    verificarEstadoArreglo();
    actualizarBotonTheme();
}
