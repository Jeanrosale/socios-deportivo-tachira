// ============================================================
// ARCHIVO: src/controllers/socio.controller.js
// PAPEL:   Registro del socio y confirmacion de su correo:
//          arma el socio, lo guarda, envia el enlace de confirmacion,
//          activa la cuenta y reenvia el enlace si hace falta.
//          No valida los campos del registro ni escribe en el archivo:
//          eso lo hacen socio.validator.js y el repositorio.
// USA:     socios.repositorio.js, seguridad.service.js, correo.service.js,
//          shared/reglas.js, shared/mensajes.js, shared/validaciones.js
// LO USA:  src/rutas.js
// ============================================================

const repositorio = require("../data/socios.repositorio");
const seguridad = require("../services/seguridad.service");
const correo = require("../services/correo.service");
const R = require("../../shared/reglas.js");
const M = require("../../shared/mensajes.js");
const V = require("../../shared/validaciones.js");

// ---------- FUNCIONES DE APOYO ----------

// Crea un token nuevo de confirmacion.
// Devuelve el token en claro (va en el enlace del correo) y los datos a guardar
// (el token cifrado y su vencimiento). El token en claro NUNCA se guarda.
function nuevoTokenConfirmacion()
{
    let token = seguridad.generarToken();
    return {
        token: token,
        cambios: {
            tokenConfirmacion: seguridad.cifrarToken(token),
            venceConfirmacion: seguridad.venceEn(R.enlaces.horasConfirmacion * 60)
        }
    };
}

// Arma el enlace completo del correo. El inicio sale del .env (URL_BASE);
// si no esta, se usa la direccion por la que llego la peticion.
function armarEnlace(req, token)
{
    let base = process.env.URL_BASE || (req.protocol + "://" + req.get("host"));
    return base + "/api/confirmar?token=" + encodeURIComponent(token);
}

// ---------- REGISTRO ----------

// POST /api/registro
// Llega desde socio.validator.js con los datos ya limpios en req.datosRegistro.
// Se guardan SOLO los datos necesarios: nunca la contrasena original, ni la
// confirmacion, ni campos extra que alguien haya mandado desde Postman.
async function registrar(req, res)
{
    let d = req.datosRegistro;
    let ahora = new Date().toISOString();
    let confirmacion = nuevoTokenConfirmacion();

    let socio = {
        // Datos del formulario (limpios)
        documento: d.documento,
        tipoDocumento: d.tipoDocumento,
        nombre: d.nombre,
        usuario: d.usuario,
        correo: d.correo,
        telefono: d.telefono,
        fechaNacimiento: d.fechaNacimiento,

        // Contrasena cifrada con bcrypt
        contrasena: await seguridad.cifrarContrasena(d.contrasena),

        // Estado: siempre empieza sin confirmar, aunque Postman mande "confirmado": true
        confirmado: false,
        // PDF - "confirmar con enlace al correo": token cifrado y su vencimiento.
        tokenConfirmacion: confirmacion.cambios.tokenConfirmacion,
        venceConfirmacion: confirmacion.cambios.venceConfirmacion,

        // Recuperacion de contrasena (codigo de 6 digitos, cifrado)
        tokenRecuperacion: null,
        venceRecuperacion: null,
        intentosRecuperacion: 0,

        // Inicio de sesion
        intentosFallidos: 0,
        bloqueadoHasta: null,

        // Dos pasos (Hito 6)
        dosPasosConfigurado: false,
        secretoDosPasos: null,
        codigosRespaldo: [],
        ingresosSinCodigo: 0,

        // Fechas. PDF - terminos: "guardar fecha y hora de aceptacion".
        fechaRegistro: ahora,
        fechaTerminos: ahora,
        fechaUltimoIngreso: null,
        fechaModificacion: ahora
    };

    // crear() vuelve a revisar duplicados dentro de la cola:
    // si dos personas se registran con el mismo correo al mismo tiempo, solo entra una.
    let creado = await repositorio.crear(socio);
    if (!creado)
    {
        return res.status(409).json({ mensaje: M.general.datoRepetido });
    }

    // Si Gmail falla, el registro NO se pierde: se avisa y el socio pide el reenvio.
    // El detalle tecnico va solo a la terminal.
    try
    {
        await correo.enviarConfirmacion(socio, armarEnlace(req, confirmacion.token));
    }
    catch (error)
    {
        console.error("No se pudo enviar el correo de confirmacion:", error.message);
        return res.status(201).json({ mensaje: M.registro.envioFallido });
    }

    // 201: se creo algo nuevo. Nunca se devuelven los datos del socio.
    res.status(201).json({ mensaje: M.registro.exito });
}

// ---------- CONFIRMAR LA CUENTA ----------

// GET /api/confirmar?token=...
// Lo abre el boton del correo. Al terminar, lleva a registro.html con un aviso.
async function confirmar(req, res)
{
    let token = (typeof req.query.token === "string") ? req.query.token : "";

    // Se busca por el token cifrado, que es como esta guardado.
    let socio = token ? await repositorio.buscarPorTokenConfirmacion(seguridad.cifrarToken(token)) : null;

    if (!socio || seguridad.estaVencido(socio.venceConfirmacion))
    {
        return res.redirect("/registro.html?aviso=enlaceInvalido");
    }

    // Un solo uso: al confirmar se borra el token.
    await repositorio.actualizar(socio.documento, {
        confirmado: true,
        tokenConfirmacion: null,
        venceConfirmacion: null,
        fechaModificacion: new Date().toISOString()
    });

    res.redirect("/registro.html?aviso=cuentaConfirmada");
}

// ---------- REENVIAR EL ENLACE ----------

// POST /api/reenviar-confirmacion   { correo }
// Malicia: responde SIEMPRE el mismo mensaje, exista o no el correo.
async function reenviarConfirmacion(req, res)
{
    let cuerpo = (req.body && typeof req.body === "object") ? req.body : {};
    let correoEscrito = V.limpiarTexto(cuerpo.correo).toLowerCase();

    let revision = V.validarCorreo(correoEscrito);
    if (!revision.valido)
    {
        return res.status(400).json({ mensaje: M.general.revisarCampos, errores: { correo: revision.mensaje } });
    }

    let socio = await repositorio.buscarPorCorreo(correoEscrito);
    if (socio && socio.confirmado !== true)
    {
        // Token nuevo: el anterior deja de servir.
        let confirmacion = nuevoTokenConfirmacion();
        confirmacion.cambios.fechaModificacion = new Date().toISOString();
        await repositorio.actualizar(socio.documento, confirmacion.cambios);

        // El correo se envia "en segundo plano" (sin await): asi la respuesta tarda lo mismo
        // exista o no el correo, y el tiempo no revela quien es socio.
        correo.enviarConfirmacion(socio, armarEnlace(req, confirmacion.token))
            .catch(function (error) { console.error("No se pudo reenviar la confirmacion:", error.message); });
    }

    res.json({ mensaje: M.registro.reenvio });
}

module.exports = { registrar, confirmar, reenviarConfirmacion };