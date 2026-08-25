// -----------------------------------------------------
// INICIAR EL ARREGLO
// -----------------------------------------------------

function iniciarArreglo() {

    // Obtener el tamaño escrito por el usuario
    const tam =
        document.getElementById("tamArreglo").value;

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
    const datos =
        "tam=" + encodeURIComponent(tam);

    // Enviar el tamaño al servidor Java
    fetch(
        "http://localhost:8080/desordenado1/iniciar",
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded"
            },

            body: datos
        }
    )

    .then(async respuesta => {

        const mensaje =
            await respuesta.text();

        if (respuesta.ok) {

            sessionStorage.setItem("arregloIniciado", "true");

            Swal.fire({
                icon: "success",
                title: "Ejercicio iniciado",
                text: mensaje
            });

            // Ocultar la configuración
            document.getElementById(
                "configuracionArreglo"
            ).style.display = "none";

            // Mostrar el menú
            document.getElementById(
                "menuOpciones"
            ).style.display = "block";

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



        function ocultarFormularios() {

            const formAlta =
                document.getElementById("formAlta");


            const formBaja =
                document.getElementById("formBaja");


            const formModificar =
                document.getElementById("formModificar");


            const formListarUno =
                document.getElementById("formListarUno");




            if (formAlta) {
                formAlta.style.display = "none";
            }


            if (formBaja) {
                formBaja.style.display = "none";
            }


            if (formModificar) {
                formModificar.style.display = "none";
            }


            if (formListarUno) {
                formListarUno.style.display = "none";
            }
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


            document.getElementById(
                "formModificar"
            ).style.display = "block";
        }

        function mostrarUno() {
            ocultarFormularios();


            document.getElementById(
                "formListarUno"
            ).style.display = "block";
        }

        function listarTodos() {
            ocultarFormularios();
            window.location.replace("listartodos.html");
        }

        function cerrarVentana() {
            sessionStorage.removeItem("arregloIniciado");
            window.location.replace("../../laboratorio1.html");
        }

        function listarUnAlumno() {
            // Obtener el nombre del alumno
            const nombre = document.getElementById("nombreListar").value.trim();

            // Validar que se haya escrito un nombre
            if (nombre === "") {
                Swal.fire({
                    icon: "warning",
                    title: "Campo vacío",
                    text: "Ingrese el nombre del alumno."
                });
                return;
            }

            // Preparar datos
            const datos =
                "nombre=" + encodeURIComponent(nombre);

            // Enviar petición a Java
            fetch(
                "http://localhost:8080/desordenado1/listaruno",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/x-www-form-urlencoded"
                    },

                    body: datos
                }
            )

            .then(async respuesta => {

                const mensaje =
                    await respuesta.text();

                if (!respuesta.ok) {

                    Swal.fire({
                        icon: "error",
                        title: "Error",
                        text: mensaje
                    });

                    return;
                }

                // Comprobar si Java encontró al alumno
                if (
                    mensaje
                        .toLowerCase()
                        .includes("no fue encontrado")
                ) {

                    Swal.fire({
                        icon: "warning",
                        title: "Alumno no encontrado",
                        text: mensaje
                    });

                } else {

                    // Mostrar los datos encontrados
                    Swal.fire({
                        icon: "success",
                        title: "Datos del alumno",

                        html:
                            "<pre style='text-align:left;'>" +
                            mensaje +
                            "</pre>"
                    });

                    // Limpiar campo
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

        function modificarAlumno() {
            // Obtener los datos del formulario de modificación
            const nombre = document.getElementById("nombreModificar").value.trim();
            const semestre = document.getElementById("semestreModificar").value;
            const promedio = document.getElementById("promedioModificar").value;

            // Validar que todos los campos estén llenos
            if (nombre === "" || semestre === "" || promedio === "") {
                Swal.fire({
                    icon: "warning",
                    title: "Campos incompletos",
                    text: "Por favor, complete todos los campos para modificar."
                });
                return;
            }

            // Preparar los datos para enviarlos a Java
            const datos =
                "nombre=" + encodeURIComponent(nombre) +
                "&semestre=" + encodeURIComponent(semestre) +
                "&promedio=" + encodeURIComponent(promedio);

            // Enviar al servidor Java
            fetch(
                "http://localhost:8080/desordenado1/modificar",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/x-www-form-urlencoded"
                    },

                    body: datos
                }
            )

            .then(async respuesta => {

                const mensaje =
                    await respuesta.text();

                if (respuesta.ok) {

                    // Si encontró al alumno y lo modificó
                    if (
                        mensaje
                            .toLowerCase()
                            .includes("modificado correctamente")
                    ) {

                        Swal.fire({
                            icon: "success",
                            title: "Alumno modificado",
                            text: mensaje
                        });

                        // Limpiar formulario
                        document.getElementById("nombreModificar").value = "";
                        document.getElementById("semestreModificar").value = "";
                        document.getElementById("promedioModificar").value = "";

                    } else {

                        // Alumno no encontrado
                        Swal.fire({
                            icon: "warning",
                            title: "Alumno no encontrado",
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

        function darDeBajaAlumno() {


            // Obtener el nombre del alumno
            const nombre =
                document.getElementById("nombreBaja").value.trim();


            // Validar que se haya escrito un nombre
            if (nombre === "") {


                Swal.fire({
                    icon: "warning",
                    title: "Campo vacío",
                    text: "Ingrese el nombre del alumno."
                });


                return;
            }


            // Preparar los datos para enviarlos a Java
            const datos =
                "nombre=" + encodeURIComponent(nombre);


            // Enviar petición al servidor Java
            fetch(
                "http://localhost:8080/desordenado1/baja",
                {
                    method: "POST",


                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },


                    body: datos
                }
            )


            .then(async respuesta => {


                // Leer la respuesta enviada por Java
                const mensaje = await respuesta.text();


                if (respuesta.ok) {


                    // Si Java eliminó al alumno correctamente
                    if (
                        mensaje
                            .toLowerCase()
                            .includes("eliminado correctamente")
                    ) {


                        Swal.fire({
                            icon: "success",
                            title: "Alumno eliminado",
                            text: mensaje
                        });


                        // Limpiar el campo
                        document.getElementById("nombreBaja").value = "";


                    } else {


                        // Si el alumno no existe
                        Swal.fire({
                            icon: "warning",
                            title: "Alumno no encontrado",
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

        function darDeAltaAlumno() {


            // Obtener los datos del formulario
            const nombre =
                document.getElementById("nombreAlumno").value.trim();


            const semestre =
                document.getElementById("semestreAlumno").value;


            const promedio =
                document.getElementById("promedioAlumno").value;




            // Comprobar que todos los campos estén llenos
            if (nombre === "" || semestre === "" || promedio === "") {


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
                "&semestre=" + encodeURIComponent(semestre) +
                "&promedio=" + encodeURIComponent(promedio);




            // Enviar los datos al servidor Java
            fetch(
                "http://localhost:8080/desordenado1/alta",
                {
                    method: "POST",


                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },


                    body: datos
                }
            )


            .then(async respuesta => {


                // Leer exactamente lo que responde Java
                const mensaje = await respuesta.text();


                // Si el servidor respondió correctamente
                if (respuesta.ok) {


                    // Si el arreglo está lleno
                    if (
                        mensaje
                            .toLowerCase()
                            .includes("no hay espacio")
                    ) {


                        Swal.fire({
                            icon: "warning",
                            title: "Arreglo lleno",
                            text: mensaje
                        });


                        return;
                    }


                    // Si sí se registró correctamente
                    Swal.fire({
                        icon: "success",
                        title: "Registro exitoso",
                        text: mensaje
                    });


                    // Limpiar campos solamente si se guardó
                    document.getElementById("nombreAlumno").value = "";
                    document.getElementById("semestreAlumno").value = "";
                    document.getElementById("promedioAlumno").value = "";


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
// VERIFICAR ESTADO AL CARGAR LA PÁGINA
// -----------------------------------------------------
function verificarEstadoArreglo() {
    if (sessionStorage.getItem("arregloIniciado") === "true") {
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