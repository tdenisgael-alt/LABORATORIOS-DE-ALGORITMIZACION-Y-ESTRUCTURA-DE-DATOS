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
        "http://localhost:8080/desordenado2/iniciar",
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
            sessionStorage.setItem("arregloIniciado_desordenado2", "true");

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

function mostrarModificar() {
    ocultarFormularios();
    document.getElementById("formModificar").style.display = "block";
}

function mostrarBaja() {
    ocultarFormularios();
    document.getElementById("formBaja").style.display = "block";
}

function mostrarUno() {
    ocultarFormularios();
    document.getElementById("formListarUno").style.display = "block";
}

function listarTodos() {
    ocultarFormularios();
    window.location.replace("listartodos.html");
}

function cerrarVentana() {
    sessionStorage.removeItem("arregloIniciado_desordenado2");
    window.location.replace("../../laboratorio1.html");
}

// -----------------------------------------------------
// 1. DAR DE ALTA CLIENTE
// -----------------------------------------------------

function darDeAltaCliente() {
    // Obtener los datos del formulario
    const nombre = document.getElementById("nombreCliente").value.trim();
    const telefono = document.getElementById("telefonoCliente").value.trim();
    const saldo = document.getElementById("saldoCliente").value.trim();
    const moroso = document.getElementById("morosoCliente").value;

    // Comprobar que todos los campos estén llenos
    if (nombre === "" || telefono === "" || saldo === "") {
        Swal.fire({
            icon: "warning",
            title: "Campos incompletos",
            text: "Por favor, complete todos los campos."
        });
        return;
    }

    // Preparar los datos para enviarlos a Java
    const datos =
        "nombre=" + encodeURIComponent(nombre) +
        "&telefono=" + encodeURIComponent(telefono) +
        "&saldo=" + encodeURIComponent(saldo) +
        "&moroso=" + encodeURIComponent(moroso);

    // Enviar los datos al servidor Java
    fetch(
        "http://localhost:8080/desordenado2/alta",
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
            document.getElementById("nombreCliente").value = "";
            document.getElementById("telefonoCliente").value = "";
            document.getElementById("saldoCliente").value = "";
            document.getElementById("morosoCliente").value = "false";

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
// 2. MODIFICAR ESTADO MOROSO
// -----------------------------------------------------

function modificarEstadoMoroso() {
    const nombre = document.getElementById("nombreModificar").value.trim();
    const moroso = document.getElementById("morosoModificar").value;

    // Validar que se haya ingresado el nombre
    if (nombre === "") {
        Swal.fire({
            icon: "warning",
            title: "Campo vacío",
            text: "Ingrese el nombre del cliente."
        });
        return;
    }

    // Preparar los datos para enviarlos a Java
    const datos =
        "nombre=" + encodeURIComponent(nombre) +
        "&moroso=" + encodeURIComponent(moroso);

    // Enviar al servidor Java
    fetch(
        "http://localhost:8080/desordenado2/modificar",
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
                    title: "Estado modificado",
                    text: mensaje
                });

                // Limpiar campos
                document.getElementById("nombreModificar").value = "";
                document.getElementById("morosoModificar").value = "false";
            } else {
                Swal.fire({
                    icon: "warning",
                    title: "Cliente no encontrado",
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
// 3. DAR DE BAJA CLIENTE
// -----------------------------------------------------

function darDeBajaCliente() {
    const nombre = document.getElementById("nombreBaja").value.trim();

    if (nombre === "") {
        Swal.fire({
            icon: "warning",
            title: "Campo vacío",
            text: "Ingrese el nombre del cliente."
        });
        return;
    }

    const datos = "nombre=" + encodeURIComponent(nombre);

    fetch(
        "http://localhost:8080/desordenado2/baja",
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
                    title: "Cliente eliminado",
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
// 4. LISTAR UN CLIENTE
// -----------------------------------------------------

function listarUnCliente() {
    const nombre = document.getElementById("nombreListar").value.trim();

    if (nombre === "") {
        Swal.fire({
            icon: "warning",
            title: "Campo vacío",
            text: "Ingrese el nombre del cliente."
        });
        return;
    }

    const datos = "nombre=" + encodeURIComponent(nombre);

    fetch(
        "http://localhost:8080/desordenado2/listaruno",
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

        // Comprobar si Java encontró al cliente
        if (
            mensaje.toLowerCase().includes("no fue encontrado") ||
            mensaje.toLowerCase().includes("no encontrado") ||
            mensaje.toLowerCase().includes("no existe")
        ) {
            Swal.fire({
                icon: "warning",
                title: "Cliente no encontrado",
                text: mensaje
            });
        } else {
            // Reemplazar true/false por Sí/No para el usuario
            let mensajeFormateado = mensaje
                .replace(/:\s*true\b/gi, ": Sí")
                .replace(/:\s*false\b/gi, ": No")
                .replace(/\btrue\b/gi, "Sí")
                .replace(/\bfalse\b/gi, "No");

            Swal.fire({
                icon: "success",
                title: "Datos del cliente",
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
    if (sessionStorage.getItem("arregloIniciado_desordenado2") === "true") {
        const config = document.getElementById("configuracionArreglo");
        const menu = document.getElementById("menuOpciones");
        if (config) config.style.display = "none";
        if (menu) menu.style.display = "block";
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", verificarEstadoArreglo);
} else {
    verificarEstadoArreglo();
}

