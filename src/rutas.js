// ============================================================
// ARCHIVO: src/rutas.js
// PAPEL:   Relaciona cada URL + metodo HTTP con su validador y su controlador.
//          Todas quedan debajo de /api (lo monta app.js).
// USA:     express, socio.validator.js, socio.controller.js, auth.controller.js
// LO USA:  src/app.js
// ============================================================

const express = require("express");
const { validarRegistro } = require("./validators/socio.validator");
const socioController = require("./controllers/socio.controller");
const authController = require("./controllers/auth.controller");

const router = express.Router();

// ---------- PRUEBA ----------

// GET /api -> confirma que la API responde.
router.get("/", function (req, res)
{
    res.json({ mensaje: "API Socios Deportivo Tachira funcionando" });
});

// ---------- REGISTRO Y CONFIRMACION ----------

// POST /api/registro -> primero el validador; si pasa, sigue el controlador (que envia el correo).
router.post("/registro", validarRegistro, socioController.registrar);

// GET /api/confirmar?token=... -> lo abre el boton del correo; activa la cuenta.
router.get("/confirmar", socioController.confirmar);

// POST /api/reenviar-confirmacion -> envia un enlace nuevo (mensaje generico siempre).
router.post("/reenviar-confirmacion", socioController.reenviarConfirmacion);

// ---------- VERIFICACION HUMANA ----------

// GET /api/reto -> entrega un reto de imagenes nuevo (tambien para "recargar").
// La respuesta correcta queda guardada en la sesion, no en lo que se envia.
router.get("/reto", authController.obtenerReto);

// ---------- INICIO DE SESION ----------

// POST /api/login -> revisa el reto, el correo y la contrasena; si estan bien, abre la sesion.
router.post("/login", authController.iniciarSesion);

// ---------- RECUPERAR CONTRASENA ----------

// POST /api/recuperar -> envia el codigo de 6 digitos (mensaje generico siempre).
router.post("/recuperar", authController.solicitarRecuperacion);

// POST /api/restablecer -> revisa el codigo y guarda la contrasena nueva.
router.post("/restablecer", authController.restablecerContrasena);

// ---------- SESION ----------

// GET /api/perfil -> primero requiereSesion; sin sesion, el controlador ni se ejecuta.
router.get("/perfil", authController.requiereSesion, authController.perfil);

// POST /api/salir -> cierra la sesion.
router.post("/salir", authController.cerrarSesion);

module.exports = router;