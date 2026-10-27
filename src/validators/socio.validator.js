// ============================================================
// ARCHIVO: src/validators/socio.validator.js
// PAPEL:   Middleware que revisa el registro ANTES de llegar al controlador.
//          Usa las mismas reglas que el navegador y agrega lo que solo el
//          servidor puede hacer: revisar que los datos no esten repetidos.
// USA:     shared/validaciones.js, shared/mensajes.js, socios.repositorio.js
// LO USA:  src/rutas.js
// ============================================================

const V = require("../../shared/validaciones.js");
const M = require("../../shared/mensajes.js");
const repositorio = require("../data/socios.repositorio");

// ---------- REGISTRO ----------

// PDF - Regla de oro: "el servidor nunca debe confiar en lo que recibe".
// 1) Limpia y valida todos los campos (lo mismo que hace el navegador).
// 2) Revisa unicidad en socios.json (esto solo lo puede hacer el servidor).
// Si todo esta bien, deja los datos limpios en req.datosRegistro y sigue al controlador.
async function validarRegistro(req, res, next)
{
    let resultado = V.validarRegistro(req.body);

    // 400: la peticion tiene errores; se devuelve un mensaje por campo.
    if (!resultado.valido)
    {
        return res.status(400).json({ mensaje: M.general.revisarCampos, errores: resultado.errores });
    }

    let d = resultado.datos;

    // PDF - telefono "guardar en formato internacional (+57...)".
    // Se convierte ANTES de revisar duplicados, porque asi esta guardado.
    d.telefono = V.formatoInternacional(d.telefono);

    // 409: conflicto con algo que ya existe. Mensaje generico: no dice cual dato.
    let repetido = await repositorio.existeDuplicado({
        documento: d.documento,
        correo: d.correo,
        usuario: d.usuario,
        telefono: d.telefono
    });
    if (repetido)
    {
        return res.status(409).json({ mensaje: M.general.datoRepetido });
    }

    req.datosRegistro = d;
    next();
}

module.exports = { validarRegistro };