// ============================================================
// ARCHIVO: src/services/verificacion.service.js
// PAPEL:   Verificacion humana del login (reto de imagenes de futbol).
//          Arma el reto y revisa la respuesta. La respuesta correcta
//          SOLO vive en la sesion del servidor: nunca viaja al navegador.
// USA:     crypto (de Node), shared/reglas.js, shared/mensajes.js
// LO USA:  src/controllers/auth.controller.js
// ============================================================

const crypto = require("crypto");
const R = require("../../shared/reglas.js");
const M = require("../../shared/mensajes.js");

// ---------- FUNCIONES DE APOYO ----------

// Desordena una lista (algoritmo Fisher-Yates).
// Se usa crypto.randomInt y no Math.random: es aleatorio de verdad y no se puede predecir.
function mezclar(lista)
{
    let copia = lista.slice();
    for (let i = copia.length - 1; i > 0; i--)
    {
        let j = crypto.randomInt(i + 1);
        let temporal = copia[i];
        copia[i] = copia[j];
        copia[j] = temporal;
    }
    return copia;
}

// Identificador aleatorio para cada opcion (16 caracteres).
// Malicia: si las opciones viajaran como "balon" o "trofeo",
// un programa leeria la respuesta directamente en el codigo de la pagina.
function idAleatorio()
{
    return crypto.randomBytes(8).toString("hex");
}

// ---------- ARMAR EL RETO ----------

// Elige al azar las imagenes, cual es la correcta y en que orden van.
// Guarda la respuesta en la sesion y devuelve solo lo que el navegador debe ver.
function crearReto(sesion)
{
    // Por si alguien pide mas opciones que objetos existentes en reglas.js.
    let cantidad = Math.min(R.verificacion.opciones, R.verificacion.objetos.length);

    let elegidos = mezclar(R.verificacion.objetos).slice(0, cantidad);
    let correcto = elegidos[crypto.randomInt(elegidos.length)];

    // A cada imagen se le asigna un id aleatorio nuevo en cada reto.
    let opciones = elegidos.map(function (objeto)
    {
        return { id: idAleatorio(), icono: objeto.icono, esCorrecto: objeto === correcto };
    });

    // Lo unico que se guarda: el id de la opcion correcta y cuando vence.
    sesion.reto = {
        respuesta: opciones.find(function (o) { return o.esCorrecto; }).id,
        venceEn: Date.now() + R.verificacion.minutosVigencia * 60 * 1000
    };

    // Al navegador va el nombre del objeto y las opciones SIN marcar cual es la correcta.
    return {
        objeto: M.verificacion.nombres[correcto.id],
        opciones: opciones.map(function (o) { return { id: o.id, icono: o.icono }; })
    };
}

// ---------- VERIFICAR LA RESPUESTA ----------

// Devuelve true solo si hay un reto vigente y la opcion elegida es la correcta.
function verificarReto(sesion, respuesta)
{
    let reto = sesion.reto;

    // Un solo uso: acierte o falle, el reto se borra.
    // Asi nadie puede probar las 4 opciones con el mismo reto.
    delete sesion.reto;

    if (!reto) return false;                          // nunca pidio un reto (por ejemplo, desde Postman)
    if (Date.now() > reto.venceEn) return false;      // el reto vencio
    if (typeof respuesta !== "string") return false;  // llego algo que no es texto
    return respuesta === reto.respuesta;
}

// Interruptor de reglas.js: con false, el login funciona sin reto.
function estaActiva()
{
    return R.verificacion.activa === true;
}

module.exports = { crearReto, verificarReto, estaActiva };