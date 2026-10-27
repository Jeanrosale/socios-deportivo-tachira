// ============================================================
// ARCHIVO: src/controllers/auth.controller.js
// PAPEL:   Inicio de sesion, recuperacion de contrasena, datos para la
//          bienvenida y cerrar sesion. Incluye el limite de intentos,
//          la verificacion humana (reto de imagenes) y la proteccion de rutas.
//          PDF - "El login debe revelar lo minimo posible y resistir
//          intentos repetidos".
// USA:     bcryptjs, crypto, shared/*, socios.repositorio.js,
//          seguridad.service.js, verificacion.service.js, correo.service.js
// LO USAN: src/rutas.js y src/app.js
// ============================================================

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const R = require("../../shared/reglas.js");
const M = require("../../shared/mensajes.js");
const V = require("../../shared/validaciones.js");
const repositorio = require("../data/socios.repositorio");
const seguridad = require("../services/seguridad.service");
const verificacion = require("../services/verificacion.service");
const correo = require("../services/correo.service");

// Nombre de la cookie de sesion (app.js la crea, cerrarSesion la borra).
const NOMBRE_COOKIE = "tachira.sid";

// Cifrado de una clave que nadie tiene. Si el correo NO existe se compara contra este:
// la respuesta tarda lo mismo y el tiempo no revela que cuentas existen.
const CIFRADO_FALSO = bcrypt.hashSync("clave-que-nadie-tiene", R.seguridad.rondasCifrado);

// ---------- LIMITE DE INTENTOS ----------

// PDF - "tras 5 fallos esperar un minuto". correo -> { fallos, bloqueadoHasta }
// Malicia: se cuenta el correo escrito, EXISTA O NO, para no revelar que cuentas existen.
const intentos = new Map();

// Segundos que faltan de bloqueo (0 = puede intentar).
function segundosDeEspera(correoEscrito)
{
    let dato = intentos.get(correoEscrito);
    if (!dato || !dato.bloqueadoHasta) return 0;

    let faltan = Math.ceil((dato.bloqueadoHasta - Date.now()) / 1000);
    if (faltan <= 0)
    {
        intentos.delete(correoEscrito);   // ya paso el minuto: empieza de cero
        return 0;
    }
    return faltan;
}

// Suma un fallo; si llega al maximo, bloquea y devuelve los segundos de espera.
function registrarFallo(correoEscrito)
{
    let dato = intentos.get(correoEscrito) || { fallos: 0, bloqueadoHasta: null };
    dato.fallos++;
    if (dato.fallos >= R.login.intentosMaximos)
    {
        dato.bloqueadoHasta = Date.now() + R.login.minutosBloqueo * 60 * 1000;
    }
    intentos.set(correoEscrito, dato);
    return segundosDeEspera(correoEscrito);
}

// 429 = demasiadas peticiones. El mensaje puede ser texto o funcion en mensajes.js.
function responderBloqueo(res, segundos)
{
    let mensaje = (typeof M.login.bloqueado === "function") ? M.login.bloqueado(segundos) : M.login.bloqueado;
    return res.status(429).json({ mensaje: mensaje, segundos: segundos });
}

// Lee el cuerpo de la peticion de forma segura (si no llega un objeto, queda vacio).
function leerCuerpo(req)
{
    return (req.body && typeof req.body === "object") ? req.body : {};
}

// ---------- PROTEGER RUTAS ----------

// Middleware: solo deja pasar si hay un socio en la sesion.
// Aunque alguien abra index.html a mano, sin sesion el servidor no entrega datos.
function requiereSesion(req, res, next)
{
    if (!req.session || !req.session.documento)
    {
        return res.status(401).json({ mensaje: M.login.sesionVencida });
    }
    next();
}

// Cambia el identificador de la sesion al entrar.
// Malicia: si alguien le "planto" un identificador al socio antes, ya no le sirve.
function regenerarSesion(req)
{
    return new Promise(function (resolver, rechazar)
    {
        req.session.regenerate(function (error) { error ? rechazar(error) : resolver(); });
    });
}

// ---------- VERIFICACION HUMANA ----------

// GET /api/reto -> entrega un reto nuevo (tambien sirve para "recargar").
// Si el interruptor de reglas.js esta apagado, avisa para que la pagina no lo muestre.
function obtenerReto(req, res)
{
    if (!verificacion.estaActiva()) return res.json({ activa: false });

    let reto = verificacion.crearReto(req.session);
    res.json({ activa: true, objeto: reto.objeto, opciones: reto.opciones });
}

// ---------- INICIAR SESION ----------

// POST /api/login   { correo, contrasena, verificacion }
async function iniciarSesion(req, res)
{
    let cuerpo = leerCuerpo(req);

    // PDF - "quitar espacios al correo, pero nunca a la contrasena".
    let correoEscrito = V.limpiarTexto(cuerpo.correo).toLowerCase();
    let contrasena = (typeof cuerpo.contrasena === "string") ? cuerpo.contrasena : "";
    let respuestaReto = (typeof cuerpo.verificacion === "string") ? cuerpo.verificacion : "";

    // PDF - "Campos obligatorios: no enviar si estan vacios".
    let errores = {};
    let revision = V.validarCorreo(correoEscrito);
    if (!revision.valido) errores.correo = revision.mensaje;
    if (contrasena === "") errores.contrasena = M.general.obligatorio;
    if (verificacion.estaActiva() && respuestaReto === "") errores.verificacion = M.verificacion.sinSeleccion;
    if (Object.keys(errores).length > 0)
    {
        return res.status(400).json({ mensaje: M.general.revisarCampos, errores: errores });
    }

    // Mientras dure el bloqueo, ni se revisa el reto ni la contrasena.
    let espera = segundosDeEspera(correoEscrito);
    if (espera > 0) return responderBloqueo(res, espera);

    // El reto se revisa ANTES que la contrasena: un programa que no lo resuelve
    // ni siquiera llega a probar claves.
    // Un reto fallado cuenta como intento fallido: asi adivinar al azar tambien lleva al bloqueo.
    if (verificacion.estaActiva() && !verificacion.verificarReto(req.session, respuestaReto))
    {
        let bloqueo = registrarFallo(correoEscrito);
        if (bloqueo > 0) return responderBloqueo(res, bloqueo);
        return res.status(400).json({ mensaje: M.verificacion.incorrecta });
    }

    let socio = await repositorio.buscarPorCorreo(correoEscrito);
    let correcta = await seguridad.compararContrasena(contrasena, socio ? socio.contrasena : CIFRADO_FALSO);

    if (!socio || !correcta)
    {
        let bloqueo = registrarFallo(correoEscrito);
        if (bloqueo > 0) return responderBloqueo(res, bloqueo);
        // PDF - mensaje generico: nunca decir cual de los dos fallo.
        return res.status(401).json({ mensaje: M.login.incorrecto });
    }

    intentos.delete(correoEscrito);

    // PDF - correo: "confirmar con enlace al correo".
    // Este aviso SOLO se da con la contrasena correcta: un extrano nunca lo ve.
    // 403 = la peticion es valida, pero todavia no tiene permiso para entrar.
    if (socio.confirmado !== true)
    {
        return res.status(403).json({ mensaje: M.login.sinConfirmar, sinConfirmar: true });
    }

    await regenerarSesion(req);
    req.session.documento = socio.documento;
    req.session.ingresoAnterior = socio.fechaUltimoIngreso;
    await repositorio.actualizar(socio.documento, { fechaUltimoIngreso: new Date().toISOString() });

    // El navegador va a donde diga el servidor.
    res.json({ siguiente: "/index.html" });
}

// ---------- RECUPERAR CONTRASENA: PEDIR EL CODIGO ----------

// Codigo aleatorio de 6 digitos. crypto.randomInt es impredecible (Math.random no).
// padStart conserva los ceros de la izquierda: 20198 -> "020198".
function generarCodigo()
{
    let digitos = R.recuperacion.digitosCodigo;
    return String(crypto.randomInt(0, 10 ** digitos)).padStart(digitos, "0");
}

// POST /api/recuperar   { correo }
// PDF - "el mismo mensaje generico aunque el correo no exista".
async function solicitarRecuperacion(req, res)
{
    let correoEscrito = V.limpiarTexto(leerCuerpo(req).correo).toLowerCase();

    let revision = V.validarCorreo(correoEscrito);
    if (!revision.valido)
    {
        return res.status(400).json({ mensaje: M.general.revisarCampos, errores: { correo: revision.mensaje } });
    }

    let socio = await repositorio.buscarPorCorreo(correoEscrito);
    if (socio)
    {
        let codigo = generarCodigo();

        // El codigo se guarda cifrado con bcrypt (lento a proposito): con solo un millon
        // de combinaciones, un cifrado rapido se podria adivinar si alguien roba socios.json.
        // Un codigo nuevo reemplaza al anterior y reinicia sus intentos.
        await repositorio.actualizar(socio.documento, {
            tokenRecuperacion: await seguridad.cifrarContrasena(codigo),
            venceRecuperacion: seguridad.venceEn(R.recuperacion.minutosVigencia),
            intentosRecuperacion: 0,
            fechaModificacion: new Date().toISOString()
        });

        // Se envia "en segundo plano" (sin await): la respuesta tarda casi lo mismo
        // exista o no el correo. Si Gmail falla, el detalle va solo a la terminal.
        correo.enviarCodigoRecuperacion(socio, codigo)
            .catch(function (error) { console.error("No se pudo enviar el codigo de recuperacion:", error.message); });
    }

    res.json({ mensaje: M.recuperacion.solicitud });
}

// ---------- RECUPERAR CONTRASENA: CAMBIARLA ----------

// POST /api/restablecer   { correo, codigo, contrasena, confirmarContrasena }
async function restablecerContrasena(req, res)
{
    let cuerpo = leerCuerpo(req);
    let correoEscrito = V.limpiarTexto(cuerpo.correo).toLowerCase();
    let codigo = V.limpiarTexto(cuerpo.codigo);
    // La contrasena nunca se limpia: se valida tal cual la escribio.
    let contrasena = (typeof cuerpo.contrasena === "string") ? cuerpo.contrasena : "";
    let confirmar = (typeof cuerpo.confirmarContrasena === "string") ? cuerpo.confirmarContrasena : "";

    // 1) Campos obligatorios y formato del codigo (solo digitos, la cantidad de reglas.js).
    let errores = {};
    let revision = V.validarCorreo(correoEscrito);
    if (!revision.valido) errores.correo = revision.mensaje;
    let formatoCodigo = new RegExp("^\\d{" + R.recuperacion.digitosCodigo + "}$");
    if (!formatoCodigo.test(codigo)) errores.codigo = M.recuperacion.codigoFormato;
    if (contrasena === "") errores.contrasena = M.general.obligatorio;
    if (confirmar === "") errores.confirmarContrasena = M.general.obligatorio;
    if (Object.keys(errores).length > 0)
    {
        return res.status(400).json({ mensaje: M.general.revisarCampos, errores: errores });
    }

    // 2) El codigo: debe existir, no haber vencido y no haber agotado sus intentos.
    let socio = await repositorio.buscarPorCorreo(correoEscrito);
    let vigente = Boolean(socio && socio.tokenRecuperacion &&
        !seguridad.estaVencido(socio.venceRecuperacion) &&
        (socio.intentosRecuperacion || 0) < R.recuperacion.intentosMaximos);

    // Si no hay codigo vigente se compara contra el cifrado falso: tarda lo mismo.
    let correcto = await seguridad.compararContrasena(codigo, vigente ? socio.tokenRecuperacion : CIFRADO_FALSO);

    if (!vigente || !correcto)
    {
        // Malicia: cada fallo suma; al llegar al maximo el codigo se anula y hay que pedir otro.
        if (vigente)
        {
            let usados = (socio.intentosRecuperacion || 0) + 1;
            let cambios = { intentosRecuperacion: usados };
            if (usados >= R.recuperacion.intentosMaximos)
            {
                cambios.tokenRecuperacion = null;
                cambios.venceRecuperacion = null;
            }
            await repositorio.actualizar(socio.documento, cambios);
        }
        // Un solo mensaje para errado, vencido, usado o anulado: no da pistas.
        return res.status(400).json({ mensaje: M.recuperacion.codigoInvalido });
    }

    // 3) La contrasena nueva cumple TODAS las reglas del registro.
    // Se usa la misma validarRegistro con los datos del socio, para revisar tambien
    // que no contenga su nombre, usuario ni correo. Solo se toman los errores de contrasena.
    let resultado = V.validarRegistro({
        nombre: socio.nombre,
        usuario: socio.usuario,
        correo: socio.correo,
        tipoDocumento: socio.tipoDocumento,
        documento: socio.documento,
        telefono: socio.telefono,
        fechaNacimiento: socio.fechaNacimiento,
        contrasena: contrasena,
        confirmarContrasena: confirmar,
        terminos: true
    });
    let erroresClave = {};
    if (resultado.errores.contrasena) erroresClave.contrasena = resultado.errores.contrasena;
    if (resultado.errores.confirmarContrasena) erroresClave.confirmarContrasena = resultado.errores.confirmarContrasena;
    if (Object.keys(erroresClave).length > 0)
    {
        // El codigo NO se gasta aqui: era correcto, solo falta corregir la contrasena.
        return res.status(400).json({ mensaje: M.general.revisarCampos, errores: erroresClave });
    }

    // 4) Se guarda la nueva contrasena cifrada y el codigo se borra (un solo uso).
    await repositorio.actualizar(socio.documento, {
        contrasena: await seguridad.cifrarContrasena(contrasena),
        tokenRecuperacion: null,
        venceRecuperacion: null,
        intentosRecuperacion: 0,
        fechaModificacion: new Date().toISOString()
    });

    // Si estaba bloqueado por intentos de login, ya puede entrar con la clave nueva.
    intentos.delete(correoEscrito);

    res.json({ mensaje: M.recuperacion.actualizada });
}

// ---------- BIENVENIDA ----------

// GET /api/perfil (requiere sesion). Solo lo necesario: nunca la contrasena.
async function perfil(req, res)
{
    let socio = await repositorio.buscarPorDocumento(req.session.documento);
    if (!socio)
    {
        req.session.destroy(function () {});
        return res.status(401).json({ mensaje: M.login.sesionVencida });
    }

    res.json({
        nombre: socio.nombre,
        usuario: socio.usuario,
        fechaRegistro: socio.fechaRegistro,
        ingresoAnterior: req.session.ingresoAnterior || null
    });
}

// ---------- CERRAR SESION ----------

// POST /api/salir
function cerrarSesion(req, res)
{
    req.session.destroy(function ()
    {
        res.clearCookie(NOMBRE_COOKIE);
        res.json({ mensaje: M.login.sesionCerrada });
    });
}

module.exports = {
    iniciarSesion,
    solicitarRecuperacion,
    restablecerContrasena,
    perfil,
    cerrarSesion,
    requiereSesion,
    obtenerReto,
    NOMBRE_COOKIE
};