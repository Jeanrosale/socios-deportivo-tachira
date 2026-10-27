// ============================================================
// ARCHIVO: src/app.js
// PAPEL:   Configura la aplicacion Express: limites, sesion, archivos
//          publicos, rutas y manejo de errores. NO la arranca (eso es server.js).
// USA:     express, express-session, crypto, path, shared/*, src/rutas.js
// LO USA:  server.js
// ============================================================

const express = require("express");
const session = require("express-session");
const crypto = require("crypto");
const path = require("path");
const R = require("../shared/reglas.js");
const M = require("../shared/mensajes.js");
const { NOMBRE_COOKIE } = require("./controllers/auth.controller");
const rutas = require("./rutas");

const app = express();

// ---------- SEGURIDAD BASICA ----------

// Malicia: quita el encabezado "X-Powered-By: Express", que le dice a un atacante que tecnologia usamos.
app.disable("x-powered-by");

// ---------- LECTURA DEL CUERPO ----------

// Convierte el JSON de la peticion en req.body.
// Malicia: limit evita que alguien mande un cuerpo gigante para tumbar el servidor.
app.use(express.json({ limit: "10kb" }));

// ---------- SESION ----------

// La sesion vive en el servidor; el navegador solo guarda una cookie con un identificador.
app.use(session({
    name: NOMBRE_COOKIE,
    // Clave para firmar la cookie. Si no esta en el .env se crea una al azar
    // (por eso, al reiniciar el servidor, las sesiones se cierran).
    secret: process.env.SECRETO_SESION || crypto.randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    // Cada peticion reinicia el reloj: la sesion vence por INACTIVIDAD.
    rolling: true,
    cookie: {
        httpOnly: true,     // el JavaScript de la pagina no puede leer la cookie
        sameSite: "lax",    // la cookie no viaja en peticiones de otros sitios
        // Profesor - 30 minutos sin actividad (valor en reglas.js).
        maxAge: R.sesion.minutosInactividad * 60 * 1000
    }
}));

// ---------- ARCHIVOS DEL NAVEGADOR ----------

// public/ -> paginas, css, js e imagenes. "/" abre index.html (la bienvenida).
app.use(express.static(path.join(__dirname, "..", "public")));

// shared/ -> reglas, mensajes y validaciones: el navegador usa LOS MISMOS archivos que el servidor.
app.use("/shared", express.static(path.join(__dirname, "..", "shared")));

// ---------- RUTAS ----------

app.use("/api", rutas);

// ---------- ERRORES ----------

// Express reconoce este middleware como manejador de errores porque recibe 4 parametros.
app.use(function (error, req, res, next)
{
    // JSON mal escrito o demasiado grande: es culpa de la peticion -> 400.
    if (error.type === "entity.parse.failed" || error.type === "entity.too.large")
    {
        return res.status(400).json({ mensaje: M.general.peticionInvalida });
    }

    // Cualquier otro: el detalle tecnico SOLO en la terminal; al usuario, un mensaje generico.
    console.error("Error en " + req.method + " " + req.originalUrl + ":");
    console.error(error);
    res.status(500).json({ mensaje: M.general.errorServidor });
});

module.exports = app;