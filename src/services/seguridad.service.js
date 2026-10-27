// ============================================================
// ARCHIVO: src/services/seguridad.service.js
// PAPEL:   Todo lo que tiene que ver con cifrado: contrasenas con bcrypt
//          y tokens de los enlaces (confirmacion y recuperacion).
// USA:     bcryptjs, crypto (viene con Node), shared/reglas.js
// LO USAN: socio.controller.js y, mas adelante, auth.controller.js
// ============================================================

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const R = require("../../shared/reglas.js");

// ---------- CONTRASENAS ----------

// Cifra la contrasena con bcrypt. El resultado ya incluye una "sal" aleatoria,
// asi dos socios con la misma clave quedan con textos cifrados distintos.
// La contrasena original NUNCA se guarda.
async function cifrarContrasena(contrasena)
{
    return bcrypt.hash(contrasena, R.seguridad.rondasCifrado);
}

// Compara lo que escribio la persona con lo guardado. bcrypt no "descifra":
// vuelve a cifrar con la misma sal y compara los resultados.
async function compararContrasena(contrasena, cifrada)
{
    if (typeof contrasena !== "string" || typeof cifrada !== "string") return false;
    return bcrypt.compare(contrasena, cifrada);
}

// ---------- TOKENS DE ENLACES ----------

// Crea un token aleatorio imposible de adivinar, para el enlace del correo.
function generarToken()
{
    return crypto.randomBytes(R.seguridad.bytesToken).toString("hex");
}

// El token se guarda cifrado con SHA-256. Si alguien roba socios.json,
// no puede usar los enlaces. Aqui no se usa bcrypt porque el token ya es aleatorio
// y largo, y SHA-256 siempre da el mismo resultado, lo que permite buscarlo.
function cifrarToken(token)
{
    return crypto.createHash("sha256").update(String(token)).digest("hex");
}

// ---------- VENCIMIENTOS ----------

// Fecha y hora de vencimiento, contando desde ahora (texto ISO, como las demas fechas).
function venceEn(minutos)
{
    return new Date(Date.now() + minutos * 60 * 1000).toISOString();
}

// true si la fecha ya paso o si no hay fecha.
function estaVencido(fechaTexto)
{
    return !fechaTexto || new Date(fechaTexto).getTime() < Date.now();
}

module.exports = {
    cifrarContrasena,
    compararContrasena,
    generarToken,
    cifrarToken,
    venceEn,
    estaVencido
};