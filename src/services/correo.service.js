// ============================================================
// ARCHIVO: src/services/correo.service.js
// PAPEL:   Envia los correos del proyecto con Gmail (nodemailer):
//          confirmacion de cuenta (enlace) y recuperacion de contrasena
//          (codigo de 6 digitos). Solo ENVIA: no decide cuando enviar
//          ni crea tokens; eso lo hacen los controladores.
// USA:     nodemailer, .env (GMAIL_USUARIO, GMAIL_CLAVE_APLICACION),
//          shared/mensajes.js
// LO USAN: socio.controller.js y auth.controller.js
// ============================================================

const nodemailer = require("nodemailer");
const M = require("../../shared/mensajes.js");

// ---------- CONEXION CON GMAIL ----------

// El "transportador" es la conexion con Gmail. Se crea la primera vez que se
// necesita (y no al cargar el archivo) para asegurar que el .env ya este leido.
let transportador = null;

function obtenerTransportador()
{
    if (transportador) return transportador;

    // Si falta algun dato en el .env, se avisa con claridad en la terminal.
    if (!process.env.GMAIL_USUARIO || !process.env.GMAIL_CLAVE_APLICACION)
    {
        throw new Error("Faltan GMAIL_USUARIO o GMAIL_CLAVE_APLICACION en el archivo .env");
    }

    transportador = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_USUARIO,
            // Contrasena de APLICACION (16 letras), nunca la contrasena normal de la cuenta.
            pass: process.env.GMAIL_CLAVE_APLICACION
        }
    });
    return transportador;
}

// ---------- FUNCIONES DE APOYO ----------

// Malicia: el nombre del socio se inserta en el HTML del correo.
// Aunque ya viene validado, se "escapa" por si acaso: asi un < o un & se muestran
// como texto y nunca se interpretan como codigo.
function escaparHtml(texto)
{
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Arma el correo con los colores del Tachira.
// Los programas de correo ignoran los archivos .css, por eso los estilos van "en linea" (style="...").
// centro: el bloque principal (el boton o el codigo), ya en HTML.
function plantilla(textos, centro)
{
    return `
    <div style="background:#0d1117; padding:24px; font-family:'Segoe UI', Arial, sans-serif;">
        <div style="max-width:480px; margin:0 auto; background:#161b22; border-top:4px solid #FFD400;
                    border-radius:12px; padding:24px; color:#e0e0e0;">
            <h1 style="margin:0 0 16px; color:#FFD400; font-size:22px;">${escaparHtml(textos.titulo)}</h1>
            <p style="margin:0 0 12px;">${escaparHtml(textos.saludo)}</p>
            <p style="margin:0 0 20px;">${escaparHtml(textos.texto)}</p>
            ${centro}
            <p style="margin:20px 0 8px; color:#8b949e; font-size:14px;">${escaparHtml(textos.vence)}</p>
            <p style="margin:0; color:#8b949e; font-size:14px;">${escaparHtml(textos.ignorar)}</p>
            <hr style="border:none; border-top:1px solid #2a2e39; margin:20px 0;">
            <p style="margin:0; color:#8b949e; font-size:12px;">${escaparHtml(M.correos.avisoAcademico)}</p>
        </div>
    </div>`;
}

// Envia un correo. Se manda en HTML y tambien en texto plano:
// algunos programas de correo no muestran HTML, y tener ambos reduce que llegue a spam.
async function enviar(para, asunto, html, texto)
{
    return obtenerTransportador().sendMail({
        from: { name: M.correos.remitente, address: process.env.GMAIL_USUARIO },
        to: para,
        subject: asunto,
        html: html,
        text: texto
    });
}

// ---------- CORREO DE CONFIRMACION ----------

// PDF - Correo: "confirmar con enlace al correo".
// socio: { nombre, correo }. enlace: la direccion completa con el token (la arma el controlador).
async function enviarConfirmacion(socio, enlace)
{
    let t = M.correos.confirmacion;
    let textos = {
        titulo: t.titulo, saludo: t.saludo(socio.nombre), texto: t.texto,
        vence: t.vence, ignorar: t.ignorar
    };

    let boton = `
        <p style="text-align:center; margin:0;">
            <a href="${escaparHtml(enlace)}"
               style="display:inline-block; padding:12px 24px; background:#FFD400; color:#000;
                      font-weight:bold; text-decoration:none; border-radius:999px;">
                ${escaparHtml(t.boton)}
            </a>
        </p>`;

    let textoPlano = [textos.saludo, textos.texto, enlace, textos.vence, textos.ignorar].join("\n\n");

    return enviar(socio.correo, t.asunto, plantilla(textos, boton), textoPlano);
}

// ---------- CORREO DE RECUPERACION ----------

// Pizarron - "Recuperar contrasena: correo -> codigo 6 digitos".
// socio: { nombre, correo }. codigo: el codigo en texto (lo genera el controlador).
async function enviarCodigoRecuperacion(socio, codigo)
{
    let t = M.correos.recuperacion;
    let textos = {
        titulo: t.titulo, saludo: t.saludo(socio.nombre), texto: t.texto,
        vence: t.vence, ignorar: t.ignorar
    };

    // El codigo grande y con espacio entre los numeros, para leerlo y escribirlo facil.
    let bloqueCodigo = `
        <p style="text-align:center; margin:0; font-size:32px; font-weight:bold;
                  letter-spacing:8px; color:#FFD400; font-family:Consolas, monospace;">
            ${escaparHtml(codigo)}
        </p>`;

    let textoPlano = [textos.saludo, textos.texto, codigo, textos.vence, textos.ignorar].join("\n\n");

    return enviar(socio.correo, t.asunto, plantilla(textos, bloqueCodigo), textoPlano);
}

module.exports = { enviarConfirmacion, enviarCodigoRecuperacion };