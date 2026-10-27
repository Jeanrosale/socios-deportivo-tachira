// ============================================================
// ARCHIVO: public/js/registro.js
// PAPEL:   Validacion del NAVEGADOR en registro.html:
//          1) Registro: error al salir de cada campo, medidor, ver/ocultar,
//             bloqueo de pegar en Confirmar, campos solo numericos y envio.
//          2) Inicio de sesion (ventana emergente): abrir/cerrar, reto de
//             imagenes, campos obligatorios, envio, reenvio de confirmacion
//             y avisos que llegan desde el correo.
//          3) Recuperar contrasena (ventana emergente): pedir el codigo y
//             cambiar la contrasena, con "segunda oportunidad".
// USA:     REGLAS, MENSAJES y VALIDACIONES (registro.html los carga antes)
// LO USA:  registro.html
// ============================================================

// ============================================================
// FUNCION COMPARTIDA: CAMPOS SOLO NUMERICOS
// ============================================================

// PDF - documento y telefono: "solo digitos". Pizarron - codigo de 6 digitos.
// Cada vez que cambia el campo (al escribir, pegar o arrastrar), se borra todo lo
// que no sea un numero. Asi las letras nunca entran, como pasa con la fecha.
// Comodidad del navegador: el servidor igual rechaza letras si llegan por Postman.
function soloNumeros(input)
{
    input.addEventListener("input", function ()
    {
        let limpio = input.value.replace(/\D/g, "");   // \D = cualquier cosa que NO sea digito
        if (limpio !== input.value) input.value = limpio;
    });
}

// ============================================================
// REGISTRO
// ============================================================

(function ()
{
    const R = window.REGLAS;
    const M = window.MENSAJES;
    const V = window.VALIDACIONES;

    const form = document.querySelector("#formRegistro");
    const aviso = document.querySelector("#avisoGeneral");
    const boton = document.querySelector("#botonRegistrar");

    // Campos que la persona ya visito. Solo a esos se les muestra el error,
    // para no reganar antes de que escriba.
    const tocados = new Set();

    // Atajo: el id de cada casilla es igual al nombre del campo en reglas.js.
    function campo(nombre)
    {
        return document.getElementById(nombre);
    }

    // ---------- PREPARAR EL FORMULARIO ----------

    // Los largos, los tipos de documento y el indicativo salen de reglas.js (nada cableado).
    // La contrasena NO lleva maxlength: si la cortara en silencio, nunca se veria el mensaje del largo.
    function prepararFormulario()
    {
        campo("nombre").maxLength = R.nombre.max;
        campo("usuario").maxLength = R.usuario.max;
        campo("correo").maxLength = R.correo.max;
        campo("documento").maxLength = R.documento.max;
        campo("telefono").maxLength = R.telefono.digitos;

        // Documento y celular solo aceptan numeros. Va ANTES de prepararCampos:
        // asi primero se borran las letras y despues se valida lo que quedo.
        soloNumeros(campo("documento"));
        soloNumeros(campo("telefono"));

        R.documento.tipos.forEach(function (tipo)
        {
            let opcion = document.createElement("option");
            opcion.value = tipo;
            opcion.textContent = tipo;
            campo("tipoDocumento").appendChild(opcion);
        });

        document.querySelector("#indicativo").textContent = R.telefono.indicativo;

        // El calendario no deja elegir fechas futuras (el servidor igual lo revisa).
        let hoy = new Date();
        campo("fechaNacimiento").max = hoy.getFullYear() + "-" +
            String(hoy.getMonth() + 1).padStart(2, "0") + "-" +
            String(hoy.getDate()).padStart(2, "0");
    }

    // ---------- LEER, VALIDAR Y MOSTRAR ----------

    // Arma el mismo objeto que recibe el servidor. Los terminos van como true/false.
    function leerFormulario()
    {
        let datos = {};
        R.camposRegistro.forEach(function (nombre)
        {
            let el = campo(nombre);
            datos[nombre] = (el.type === "checkbox") ? el.checked : el.value;
        });
        return datos;
    }

    // Pinta debajo de cada casilla su error (solo si ya fue tocada).
    function mostrarErrores(errores)
    {
        R.camposRegistro.forEach(function (nombre)
        {
            let mensaje = tocados.has(nombre) ? (errores[nombre] || "") : "";
            document.getElementById("error-" + nombre).textContent = mensaje;
            campo(nombre).classList.toggle("invalido", mensaje !== "");
            campo(nombre).setAttribute("aria-invalid", mensaje !== "" ? "true" : "false");
        });
    }

    // PDF - Regla de oro: se valida con validarRegistro, la MISMA funcion del servidor.
    // El medidor se actualiza aqui con los mismos errores: asi cambia tambien
    // cuando se edita el nombre, el usuario o el correo (datos personales).
    function revisar()
    {
        let resultado = V.validarRegistro(leerFormulario());
        mostrarErrores(resultado.errores);
        actualizarMedidor(resultado.errores);
        return resultado;
    }

    function mostrarAviso(texto, tipo)
    {
        aviso.textContent = texto;
        aviso.className = "aviso " + (tipo || "");
        aviso.hidden = (texto === "");
    }

    // ---------- MEDIDOR ----------

    // PDF - "Mostrar un medidor de fortaleza". Color y texto segun el nivel,
    // y el mensaje dice exactamente lo que falta.
    // Regla: si la contrasena tiene CUALQUIER error (comun, datos personales,
    // prohibidos...), la barra NUNCA llega a verde: se queda un nivel abajo.
    // Mientras escribe, el motivo sale en el texto del medidor; cuando ya salio
    // del campo, el motivo sale en la linea roja de abajo (para no repetirlo).
    function actualizarMedidor(errores)
    {
        errores = errores || {};
        let valor = campo("contrasena").value;
        let barra = document.querySelector("#barraMedidor");
        let texto = document.querySelector("#textoMedidor");

        if (valor === "")
        {
            barra.style.width = "0";
            barra.className = "";
            texto.textContent = "";
            return;
        }

        let m = V.medirContrasena(valor);
        let nivelMaximo = M.contrasena.niveles.length - 1;
        let nivel = m.nivel;
        let mensajeTexto = (m.texto ? m.texto + ": " : "") + m.mensaje;

        // Por composicion seria Fuerte, pero otra regla la rechaza.
        if (nivel === nivelMaximo && errores.contrasena)
        {
            nivel = nivelMaximo - 1;
            mensajeTexto = tocados.has("contrasena") ? "" : errores.contrasena;
        }

        barra.style.width = (nivel / nivelMaximo * 100) + "%";
        barra.className = "nivel" + nivel;
        texto.textContent = mensajeTexto;
    }

    // ---------- VER / OCULTAR ----------

    // PDF - "un boton para ver u ocultar el texto". Sirve para TODAS las contrasenas
    // de la pagina (registro, login y recuperacion), porque cada boton dice en data-para
    // a que casilla pertenece.
    function prepararBotonesVer()
    {
        document.querySelectorAll(".botonVer").forEach(function (b)
        {
            b.addEventListener("click", function ()
            {
                let input = campo(b.dataset.para);
                let estaOculta = (input.type === "password");
                input.type = estaOculta ? "text" : "password";
                b.textContent = estaOculta ? "Ocultar" : "Ver";
            });
        });
    }

    function ocultarContrasenas()
    {
        document.querySelectorAll(".botonVer").forEach(function (b)
        {
            campo(b.dataset.para).type = "password";
            b.textContent = "Ver";
        });
    }

    // ---------- PEGAR Y COPIAR ----------

    // PDF - "Permitir pegar" en Contrasena, para que funcionen los gestores de contrasenas.
    // Pizarron - en Confirmar se escribe a mano (ni pegar ni arrastrar texto).
    // Copiar y cortar se bloquean en las dos, para que la clave no quede en el portapapeles.
    function prepararPegado()
    {
        let confirmar = campo("confirmarContrasena");

        confirmar.addEventListener("paste", function (e)
        {
            e.preventDefault();
            document.getElementById("error-confirmarContrasena").textContent = M.contrasena.noPegar;
        });
        confirmar.addEventListener("drop", function (e) { e.preventDefault(); });

        ["contrasena", "confirmarContrasena"].forEach(function (nombre)
        {
            campo(nombre).addEventListener("copy", function (e) { e.preventDefault(); });
            campo(nombre).addEventListener("cut", function (e) { e.preventDefault(); });
        });
    }

    // ---------- EVENTOS DE LOS CAMPOS ----------

    // Al salir de un campo (blur) queda "tocado" y se valida.
    // Mientras escribe, se vuelve a validar para que el error desaparezca apenas se corrija.
    // revisar() tambien actualiza el medidor, por eso no hace falta un evento aparte.
    function prepararCampos()
    {
        R.camposRegistro.forEach(function (nombre)
        {
            let el = campo(nombre);
            let evento = (el.type === "checkbox" || el.tagName === "SELECT") ? "change" : "input";

            el.addEventListener("blur", function ()
            {
                tocados.add(nombre);
                revisar();
            });

            el.addEventListener(evento, function ()
            {
                if (evento === "change") tocados.add(nombre);
                revisar();
            });
        });
    }

    // ---------- ENVIO ----------

    // El navegador revisa primero para no mandar algo que ya sabe que esta mal
    // (PDF - "evita envios innecesarios"), pero la ultima palabra es del servidor.
    async function enviar(e)
    {
        e.preventDefault();
        mostrarAviso("");

        // Al enviar, todos los campos cuentan como tocados.
        R.camposRegistro.forEach(function (nombre) { tocados.add(nombre); });
        let resultado = revisar();

        if (!resultado.valido)
        {
            mostrarAviso(M.general.revisarCampos, "error");
            let primero = R.camposRegistro.find(function (nombre) { return resultado.errores[nombre]; });
            campo(primero).focus();
            return;
        }

        // Se desactiva el boton para que un doble clic no mande dos registros.
        boton.disabled = true;
        try
        {
            // Se manda lo que escribio la persona: el servidor lo limpia y valida otra vez.
            let respuesta = await fetch("/api/registro", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(leerFormulario())
            });
            let datos = await respuesta.json().catch(function () { return {}; });

            if (respuesta.status === 201)
            {
                form.reset();
                tocados.clear();
                mostrarErrores({});
                actualizarMedidor();
                ocultarContrasenas();
                mostrarAviso(datos.mensaje, "exito");
            }
            else
            {
                // 400: el servidor encontro errores; se pintan en sus casillas.
                // 409: dato repetido; va solo en el aviso general.
                if (datos.errores) mostrarErrores(datos.errores);
                mostrarAviso(datos.mensaje || M.general.errorServidor, "error");
            }
        }
        catch (error)
        {
            // Servidor apagado o sin conexion.
            mostrarAviso(M.general.errorServidor, "error");
        }
        finally
        {
            boton.disabled = false;
            aviso.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }

    // ---------- INICIO ----------

    prepararFormulario();
    prepararBotonesVer();
    prepararPegado();
    prepararCampos();
    form.addEventListener("submit", enviar);

})();

// ============================================================
// INICIO DE SESION (ventana emergente de registro.html)
// PDF - campos obligatorios; quitar espacios al correo, nunca a la
// contrasena. El mensaje generico, el limite de intentos, la revision
// del reto de imagenes y la cuenta confirmada los decide el servidor.
// ============================================================

(function ()
{
    const R = window.REGLAS;
    const M = window.MENSAJES;
    const V = window.VALIDACIONES;

    const ventana = document.querySelector("#ventanaLogin");
    const form = document.querySelector("#formLogin");
    const aviso = document.querySelector("#avisoLogin");
    const boton = document.querySelector("#botonIniciar");
    const botonReenviar = document.querySelector("#botonReenviar");
    let reloj = null;

    // Estado del reto: si el servidor lo tiene encendido y que imagen eligio el socio.
    let retoActivo = false;
    let respuestaReto = "";

    function mostrarAviso(texto, tipo)
    {
        aviso.textContent = texto;
        aviso.className = "aviso " + (tipo || "");
        aviso.hidden = (texto === "");
    }

    function mostrarError(id, mensaje)
    {
        document.getElementById("error-" + id).textContent = mensaje || "";
        document.getElementById(id).classList.toggle("invalido", Boolean(mensaje));
    }

    function mostrarReenviar(visible)
    {
        botonReenviar.hidden = !visible;
    }

    // ---------- RETO DE IMAGENES (verificacion humana) ----------

    // Pide al servidor un reto nuevo y lo dibuja.
    // Se llama al abrir la ventana, al pulsar recargar y despues de cada intento fallido
    // (el servidor borra el reto apenas se usa, asi que siempre hace falta uno nuevo).
    async function cargarReto()
    {
        respuestaReto = "";
        mostrarError("verificacion", "");

        try
        {
            let respuesta = await fetch("/api/reto");
            let datos = await respuesta.json();

            // Interruptor de reglas.js apagado: el bloque no se muestra.
            retoActivo = (datos.activa === true);
            document.querySelector("#bloqueReto").hidden = !retoActivo;
            if (!retoActivo) return;

            document.querySelector("#objetoReto").textContent = datos.objeto;
            dibujarOpciones(datos.opciones);
        }
        catch (error)
        {
            mostrarAviso(M.general.errorServidor, "error");
        }
    }

    // Crea un boton por imagen. Se usa createElement (y no innerHTML) para que
    // nada de lo que llega se interprete como codigo HTML.
    // Malicia: cada boton se anuncia como "Opcion 1, 2..." y no por su nombre,
    // para no regalar la respuesta a un programa que lea la pagina.
    function dibujarOpciones(opciones)
    {
        let contenedor = document.querySelector("#opcionesReto");
        contenedor.innerHTML = "";

        opciones.forEach(function (opcion, posicion)
        {
            let botonOpcion = document.createElement("button");
            botonOpcion.type = "button";
            botonOpcion.className = "opcionReto";
            botonOpcion.setAttribute("aria-label", "Opción " + (posicion + 1));
            botonOpcion.setAttribute("aria-pressed", "false");

            let icono = document.createElement("i");
            icono.className = "fa-solid " + opcion.icono;
            botonOpcion.appendChild(icono);

            botonOpcion.addEventListener("click", function ()
            {
                elegirOpcion(botonOpcion, opcion.id);
            });

            contenedor.appendChild(botonOpcion);
        });
    }

    // Marca la imagen elegida y desmarca las demas. Solo se guarda su id aleatorio.
    function elegirOpcion(botonElegido, id)
    {
        document.querySelectorAll(".opcionReto").forEach(function (b)
        {
            b.classList.remove("seleccionada");
            b.setAttribute("aria-pressed", "false");
        });
        botonElegido.classList.add("seleccionada");
        botonElegido.setAttribute("aria-pressed", "true");
        respuestaReto = id;
        mostrarError("verificacion", "");
    }

    // ---------- ABRIR / CERRAR LA VENTANA ----------

    // showModal() muestra la ventana encima de todo y oscurece el fondo.
    // Cada vez que se abre, se pide un reto nuevo.
    function abrirVentana()
    {
        if (!ventana.open) ventana.showModal();
        document.querySelector("#loginCorreo").focus();
        cargarReto();
    }

    function cerrarVentana()
    {
        ventana.close();
    }

    // Al cerrar (con la X, con Esc o con clic afuera) se limpia la contrasena,
    // para que no quede escrita si otra persona usa el computador.
    // Si hay bloqueo activo, el aviso se deja para que se vea al volver a abrir.
    function alCerrar()
    {
        let input = document.querySelector("#loginContrasena");
        input.value = "";
        input.type = "password";
        document.querySelector("[data-para='loginContrasena']").textContent = "Ver";
        mostrarError("loginCorreo", "");
        mostrarError("loginContrasena", "");
        mostrarError("verificacion", "");
        mostrarReenviar(false);
        if (!boton.disabled) mostrarAviso("");
    }

    // Un clic en el fondo oscuro cierra. Dentro de la ventana el clic cae en
    // .contenidoVentana, por eso solo el fondo tiene como destino el dialog.
    function clicEnFondo(e)
    {
        if (e.target === ventana) cerrarVentana();
    }

    // ---------- LIMITE DE INTENTOS ----------

    // PDF - "tras 5 fallos esperar un minuto": el boton queda apagado con cuenta regresiva.
    function esperarBloqueo(segundos)
    {
        clearInterval(reloj);
        let restantes = segundos;
        boton.disabled = true;
        boton.textContent = "Espera " + restantes + " s";
        reloj = setInterval(function ()
        {
            restantes--;
            if (restantes <= 0)
            {
                clearInterval(reloj);
                boton.disabled = false;
                boton.textContent = "Iniciar sesión";
                mostrarAviso("");
                return;
            }
            boton.textContent = "Espera " + restantes + " s";
        }, 1000);
    }

    // ---------- REENVIAR EL ENLACE DE CONFIRMACION ----------

    // Usa el correo escrito en el login. El servidor responde siempre el mismo
    // mensaje generico, exista o no la cuenta.
    async function reenviarConfirmacion()
    {
        let correo = V.limpiarTexto(document.querySelector("#loginCorreo").value).toLowerCase();
        let revision = V.validarCorreo(correo);
        mostrarError("loginCorreo", revision.valido ? "" : revision.mensaje);
        if (!revision.valido) return;

        botonReenviar.disabled = true;
        try
        {
            let respuesta = await fetch("/api/reenviar-confirmacion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ correo: correo })
            });
            let datos = await respuesta.json().catch(function () { return {}; });

            mostrarAviso(datos.mensaje || M.general.errorServidor, respuesta.ok ? "exito" : "error");
            if (respuesta.ok) mostrarReenviar(false);
        }
        catch (error)
        {
            mostrarAviso(M.general.errorServidor, "error");
        }
        finally
        {
            botonReenviar.disabled = false;
        }
    }

    // ---------- ENVIO ----------

    async function enviar(e)
    {
        e.preventDefault();
        mostrarAviso("");
        mostrarReenviar(false);

        // Correo: se limpia como en el servidor. Contrasena: tal cual.
        let correo = V.limpiarTexto(document.querySelector("#loginCorreo").value).toLowerCase();
        let contrasena = document.querySelector("#loginContrasena").value;

        let revision = V.validarCorreo(correo);
        let faltaReto = retoActivo && respuestaReto === "";
        mostrarError("loginCorreo", revision.valido ? "" : revision.mensaje);
        mostrarError("loginContrasena", contrasena === "" ? M.general.obligatorio : "");
        mostrarError("verificacion", faltaReto ? M.verificacion.sinSeleccion : "");
        if (!revision.valido || contrasena === "" || faltaReto) return;

        boton.disabled = true;
        try
        {
            let respuesta = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // Si el reto esta apagado, "verificacion" no se envia (JSON omite undefined).
                body: JSON.stringify({
                    correo: correo,
                    contrasena: contrasena,
                    verificacion: retoActivo ? respuestaReto : undefined
                })
            });
            let datos = await respuesta.json().catch(function () { return {}; });

            if (respuesta.status === 200)
            {
                location.href = datos.siguiente;   // index.html (portal del socio)
                return;
            }

            boton.disabled = false;
            document.querySelector("#loginContrasena").value = "";

            // El reto ya se gasto en el servidor: se pide uno nuevo para el siguiente intento.
            cargarReto();

            if (respuesta.status === 429)
            {
                mostrarAviso(datos.mensaje, "error");
                esperarBloqueo(datos.segundos || R.login.minutosBloqueo * 60);
                return;
            }

            // 403: contrasena correcta, pero la cuenta aun no esta confirmada.
            if (respuesta.status === 403 && datos.sinConfirmar)
            {
                mostrarAviso(datos.mensaje, "error");
                mostrarReenviar(true);
                return;
            }

            // 400: reto incorrecto o vencido. 401: "Correo o contrasena incorrectos".
            mostrarAviso(datos.mensaje || M.general.errorServidor, "error");
        }
        catch (error)
        {
            boton.disabled = false;
            mostrarAviso(M.general.errorServidor, "error");
        }
    }

    // ---------- AVISOS QUE LLEGAN EN LA DIRECCION ----------

    // index.html (sesion vencida o cerrada) y el enlace del correo (cuenta confirmada
    // o enlace vencido) llegan con ?aviso=... y aqui se convierten en un mensaje.
    // Malicia: solo se aceptan estos nombres; cualquier otro valor en la direccion se ignora.
    const AVISOS_DIRECCION = {
        sesionVencida: [M.login.sesionVencida, "error"],
        sesionCerrada: [M.login.sesionCerrada, "exito"],
        cuentaConfirmada: [M.registro.confirmada, "exito"],
        enlaceInvalido: [M.registro.enlaceInvalido, "error"]
    };

    function leerAvisoDeDireccion()
    {
        let motivo = new URLSearchParams(location.search).get("aviso");
        // hasOwnProperty evita nombres "trampa" como "constructor", que todo objeto trae.
        if (!motivo || !Object.prototype.hasOwnProperty.call(AVISOS_DIRECCION, motivo)) return;

        mostrarAviso(AVISOS_DIRECCION[motivo][0], AVISOS_DIRECCION[motivo][1]);
        if (motivo === "enlaceInvalido") mostrarReenviar(true);
        abrirVentana();

        // Se quita el ?aviso=... de la direccion: al recargar, el aviso no vuelve a salir.
        history.replaceState(null, "", location.pathname);
    }

    // ---------- INICIO ----------

    // Textos del reto tomados de mensajes.js (nada cableado).
    document.querySelector("#instruccionReto").textContent = M.verificacion.instruccion;
    let botonRecargar = document.querySelector("#botonRecargarReto");
    botonRecargar.title = M.verificacion.recargar;
    botonRecargar.setAttribute("aria-label", M.verificacion.recargar);
    botonRecargar.addEventListener("click", cargarReto);

    document.querySelector("#loginCorreo").maxLength = R.correo.max;
    document.querySelector("#botonAbrirLogin").addEventListener("click", abrirVentana);
    document.querySelector("#botonCerrarLogin").addEventListener("click", cerrarVentana);
    botonReenviar.addEventListener("click", reenviarConfirmacion);
    ventana.addEventListener("click", clicEnFondo);
    ventana.addEventListener("close", alCerrar);
    form.addEventListener("submit", enviar);

    // La ventana de recuperacion usa esta funcion para volver al login con un aviso.
    window.abrirLogin = function (texto, tipo)
    {
        abrirVentana();
        if (texto) mostrarAviso(texto, tipo);
    };

    leerAvisoDeDireccion();
})();

// ============================================================
// RECUPERAR CONTRASENA (ventana emergente de registro.html)
// Pizarron - "Olvide la contrasena": correo -> codigo de 6 digitos ->
// nueva contrasena y repetirla. El servidor revisa el codigo (vencimiento,
// un solo uso, intentos) y TODAS las reglas de la contrasena.
// La ventana da "segunda oportunidad": no se cierra con Esc ni con clic
// afuera, y si se cierra con la X, al volver a abrirla sigue en el paso
// del codigo mientras este siga vigente.
// ============================================================

(function ()
{
    const R = window.REGLAS;
    const M = window.MENSAJES;
    const V = window.VALIDACIONES;

    const ventana = document.querySelector("#ventanaRecuperar");
    const formPedir = document.querySelector("#formPedirCodigo");
    const formCambiar = document.querySelector("#formCambiarContrasena");
    const aviso = document.querySelector("#avisoRecuperar");
    const botonPedir = document.querySelector("#botonPedirCodigo");
    const botonCambiar = document.querySelector("#botonCambiarContrasena");
    const botonReenviarCodigo = document.querySelector("#botonReenviarCodigo");

    // Proceso en curso: a que correo se pidio el codigo y cuando.
    // Mientras el codigo este vigente, la ventana recuerda el paso 2.
    let correoActual = "";
    let pedidoEn = 0;

    function campo(id)
    {
        return document.getElementById(id);
    }

    function mostrarAviso(texto, tipo)
    {
        aviso.textContent = texto;
        aviso.className = "aviso " + (tipo || "");
        aviso.hidden = (texto === "");
    }

    function mostrarError(id, mensaje)
    {
        document.getElementById("error-" + id).textContent = mensaje || "";
        campo(id).classList.toggle("invalido", Boolean(mensaje));
    }

    // Muestra el paso 1 (pedir codigo) o el paso 2 (cambiar contrasena).
    function mostrarPaso(numero)
    {
        formPedir.hidden = (numero !== 1);
        formCambiar.hidden = (numero !== 2);
    }

    // true si hay un codigo pedido que todavia no vence (tiempo de reglas.js).
    function hayCodigoVigente()
    {
        return correoActual !== "" &&
            (Date.now() - pedidoEn) < R.recuperacion.minutosVigencia * 60 * 1000;
    }

    // Olvida el proceso: se usa al terminar con exito o al cambiar de correo.
    function reiniciarProceso()
    {
        correoActual = "";
        pedidoEn = 0;
        campo("recCodigo").value = "";
        mostrarError("recCodigo", "");
    }

    // Borra las contrasenas escritas (nunca se dejan en pantalla al salir).
    function borrarContrasenas()
    {
        ["recContrasena", "recConfirmar"].forEach(function (id)
        {
            campo(id).value = "";
            campo(id).type = "password";
            document.querySelector("[data-para='" + id + "']").textContent = "Ver";
            mostrarError(id, "");
        });
        actualizarMedidor();
    }

    // ---------- ABRIR / CERRAR ----------

    // Se cierra el login y se abre esta ventana.
    // Si hay un codigo vigente, vuelve directo al paso 2 (segunda oportunidad).
    // Si no, empieza en el paso 1 y copia el correo escrito en el login.
    function abrir()
    {
        document.querySelector("#ventanaLogin").close();
        mostrarAviso("");

        if (hayCodigoVigente())
        {
            mostrarPaso(2);
            if (!ventana.open) ventana.showModal();
            campo("recCodigo").focus();
            return;
        }

        reiniciarProceso();
        campo("recCorreo").value = V.limpiarTexto(campo("loginCorreo").value);
        mostrarPaso(1);
        if (!ventana.open) ventana.showModal();
        campo("recCorreo").focus();
    }

    // Solo la X cierra la ventana.
    function cerrar()
    {
        ventana.close();
    }

    // Al cerrar se borran las contrasenas, pero se conserva el correo y el codigo
    // escrito: si el codigo sigue vigente, al volver a abrir se continua donde iba.
    function alCerrar()
    {
        borrarContrasenas();
        mostrarError("recCorreo", "");
        mostrarAviso("");
    }

    // La tecla Esc lanza el evento "cancel" en la ventana: se anula para que
    // un Esc accidental (por ejemplo, al cerrar un aviso de Chrome) no la cierre.
    function evitarEsc(e)
    {
        e.preventDefault();
    }

    // ---------- MEDIDOR ----------

    // El mismo medidor del registro: color segun el nivel y lo que falta.
    // (Que no contenga el nombre, usuario o correo lo revisa el servidor,
    // porque el navegador no conoce los datos del socio.)
    function actualizarMedidor()
    {
        let valor = campo("recContrasena").value;
        let barra = document.querySelector("#barraRecuperar");
        let texto = document.querySelector("#textoRecuperar");

        if (valor === "")
        {
            barra.style.width = "0";
            barra.className = "";
            texto.textContent = "";
            return;
        }

        let m = V.medirContrasena(valor);
        let nivelMaximo = M.contrasena.niveles.length - 1;
        barra.style.width = (m.nivel / nivelMaximo * 100) + "%";
        barra.className = "nivel" + m.nivel;
        texto.textContent = (m.texto ? m.texto + ": " : "") + m.mensaje;
    }

    // ---------- PASO 1: PEDIR EL CODIGO ----------

    // Envia la solicitud. Se usa tambien para "Reenviar codigo".
    // Cada codigo nuevo reemplaza al anterior (en el servidor y aqui).
    async function solicitarCodigo(correo, botonUsado)
    {
        botonUsado.disabled = true;
        try
        {
            let respuesta = await fetch("/api/recuperar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ correo: correo })
            });
            let datos = await respuesta.json().catch(function () { return {}; });

            if (respuesta.ok)
            {
                // PDF - mensaje generico: se pasa al paso 2 exista o no el correo.
                correoActual = correo;
                pedidoEn = Date.now();
                campo("recCodigo").value = "";
                mostrarPaso(2);
                mostrarAviso(datos.mensaje, "exito");
                campo("recCodigo").focus();
                return;
            }

            if (datos.errores && datos.errores.correo) mostrarError("recCorreo", datos.errores.correo);
            mostrarAviso(datos.mensaje || M.general.errorServidor, "error");
        }
        catch (error)
        {
            mostrarAviso(M.general.errorServidor, "error");
        }
        finally
        {
            botonUsado.disabled = false;
        }
    }

    async function pedirCodigo(e)
    {
        e.preventDefault();
        mostrarAviso("");

        // Correo: se limpia como en el servidor.
        let correo = V.limpiarTexto(campo("recCorreo").value).toLowerCase();
        let revision = V.validarCorreo(correo);
        mostrarError("recCorreo", revision.valido ? "" : revision.mensaje);
        if (!revision.valido) return;

        await solicitarCodigo(correo, botonPedir);
    }

    // ---------- PASO 2: CAMBIAR LA CONTRASENA ----------

    async function cambiarContrasena(e)
    {
        e.preventDefault();
        mostrarAviso("");

        let codigo = V.limpiarTexto(campo("recCodigo").value);
        // Las contrasenas nunca se limpian.
        let nueva = campo("recContrasena").value;
        let repetir = campo("recConfirmar").value;

        // El navegador revisa lo basico para no enviar algo que ya sabe que esta mal.
        let formatoCodigo = new RegExp("^\\d{" + R.recuperacion.digitosCodigo + "}$");
        let errores = {
            recCodigo: formatoCodigo.test(codigo) ? "" : M.recuperacion.codigoFormato,
            recContrasena: (nueva === "") ? M.general.obligatorio
                : (V.medirContrasena(nueva).nivel < R.contrasena.nivelRequerido ? M.contrasena.noFuerte : ""),
            recConfirmar: (repetir === "") ? M.general.obligatorio
                : (repetir !== nueva ? M.contrasena.noCoinciden : "")
        };
        Object.keys(errores).forEach(function (id) { mostrarError(id, errores[id]); });
        if (Object.values(errores).some(Boolean)) return;

        botonCambiar.disabled = true;
        try
        {
            let respuesta = await fetch("/api/restablecer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    correo: correoActual,
                    codigo: codigo,
                    contrasena: nueva,
                    confirmarContrasena: repetir
                })
            });
            let datos = await respuesta.json().catch(function () { return {}; });

            if (respuesta.ok)
            {
                // Contrasena cambiada: se olvida el proceso y se vuelve al login con el aviso.
                reiniciarProceso();
                cerrar();
                window.abrirLogin(datos.mensaje, "exito");
                return;
            }

            // Los errores del servidor se pintan en su casilla.
            // (contrasena puede traer, por ejemplo, "no puede contener tu nombre").
            const CASILLA = { codigo: "recCodigo", contrasena: "recContrasena", confirmarContrasena: "recConfirmar" };
            if (datos.errores)
            {
                Object.keys(CASILLA).forEach(function (clave)
                {
                    if (datos.errores[clave]) mostrarError(CASILLA[clave], datos.errores[clave]);
                });
            }
            mostrarAviso(datos.mensaje || M.general.errorServidor, "error");
        }
        catch (error)
        {
            mostrarAviso(M.general.errorServidor, "error");
        }
        finally
        {
            botonCambiar.disabled = false;
        }
    }

    // ---------- PEGAR Y COPIAR ----------

    // Las mismas reglas del registro: en "Repetir" se escribe a mano;
    // copiar y cortar se bloquean en las dos contrasenas.
    function prepararPegado()
    {
        let repetir = campo("recConfirmar");
        repetir.addEventListener("paste", function (e)
        {
            e.preventDefault();
            mostrarError("recConfirmar", M.contrasena.noPegar);
        });
        repetir.addEventListener("drop", function (e) { e.preventDefault(); });

        ["recContrasena", "recConfirmar"].forEach(function (id)
        {
            campo(id).addEventListener("copy", function (e) { e.preventDefault(); });
            campo(id).addEventListener("cut", function (e) { e.preventDefault(); });
        });
    }

    // ---------- INICIO ----------

    // Textos y largos tomados de reglas.js y mensajes.js (nada cableado).
    document.querySelector("#instruccionCodigo").textContent = M.recuperacion.instruccionCodigo;
    campo("recCorreo").maxLength = R.correo.max;
    campo("recCodigo").maxLength = R.recuperacion.digitosCodigo;

    // El codigo solo acepta numeros (va antes de los demas eventos del campo).
    soloNumeros(campo("recCodigo"));

    // Mientras escribe, se actualiza el medidor y se borra el error de esa casilla.
    campo("recContrasena").addEventListener("input", function ()
    {
        actualizarMedidor();
        mostrarError("recContrasena", "");
    });
    ["recCorreo", "recCodigo", "recConfirmar"].forEach(function (id)
    {
        campo(id).addEventListener("input", function () { mostrarError(id, ""); });
    });

    prepararPegado();
    document.querySelector("#botonOlvide").addEventListener("click", abrir);
    document.querySelector("#botonCerrarRecuperar").addEventListener("click", cerrar);
    document.querySelector("#botonVolverCorreo").addEventListener("click", function ()
    {
        // Cambiar de correo empieza un proceso nuevo.
        reiniciarProceso();
        mostrarAviso("");
        mostrarPaso(1);
        campo("recCorreo").focus();
    });
    botonReenviarCodigo.addEventListener("click", function ()
    {
        if (correoActual) solicitarCodigo(correoActual, botonReenviarCodigo);
    });
    ventana.addEventListener("cancel", evitarEsc);
    ventana.addEventListener("close", alCerrar);
    formPedir.addEventListener("submit", pedirCodigo);
    formCambiar.addEventListener("submit", cambiarContrasena);
})();