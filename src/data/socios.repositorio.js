// ============================================================
// ARCHIVO: src/data/socios.repositorio.js
// PAPEL:   Unica puerta de entrada a socios.json. Lee, busca, crea y
//          actualiza socios. Ningun otro archivo toca socios.json.
// USA:     fs/promises y path (vienen con Node), shared/reglas.js
// LO USAN: server.js (revision al arrancar) y los controladores de socio y auth
// ============================================================

const fs = require("fs/promises");
const path = require("path");
const R = require("../../shared/reglas.js");

// ---------- RUTAS DEL ARCHIVO ----------

// __dirname es la carpeta de ESTE archivo (src/data). Asi la ruta funciona
// sin importar desde que carpeta se ejecute node.
const ARCHIVO = path.join(__dirname, "socios.json");
const TEMPORAL = path.join(__dirname, "socios.tmp.json");

// ---------- COLA DE ESCRITURA ----------

// Malicia: si llegan dos registros al mismo tiempo, los dos leerian la lista vieja
// y el segundo borraria al primero al guardar. La cola hace que esperen su turno.
let cola = Promise.resolve();

function enCola(tarea)
{
    let resultado = cola.then(tarea);
    // Si una tarea falla, la cola sigue funcionando para las siguientes.
    cola = resultado.catch(function () {});
    return resultado;
}

// ---------- LEER Y GUARDAR ----------

// Lee la lista completa de socios.
// Si el archivo no existe, lo crea vacio. Si existe pero esta danado, lanza el error:
// NUNCA lo sobrescribe, para no perder los socios que ya estaban.
async function leerTodos()
{
    let texto;
    try
    {
        texto = await fs.readFile(ARCHIVO, "utf8");
    }
    catch (error)
    {
        if (error.code === "ENOENT")
        {
            await guardarTodos([]);
            return [];
        }
        throw error;
    }

    if (texto.trim() === "") return [];

    let lista;
    try
    {
        lista = JSON.parse(texto);
    }
    catch (error)
    {
        throw new Error("socios.json esta danado (" + error.message + ")");
    }

    if (!Array.isArray(lista)) throw new Error("socios.json debe contener una lista [ ]");
    return lista;
}

// Guarda la lista completa. Primero escribe un archivo temporal y luego lo renombra:
// si el computador se apaga a mitad de la escritura, socios.json queda intacto.
async function guardarTodos(lista)
{
    let texto = JSON.stringify(lista, null, 2);
    await fs.writeFile(TEMPORAL, texto, "utf8");
    try
    {
        await fs.rename(TEMPORAL, ARCHIVO);
    }
    catch (error)
    {
        // En Windows, un antivirus puede bloquear el cambio de nombre un instante.
        // En ese caso se escribe directo y se borra el temporal.
        await fs.writeFile(ARCHIVO, texto, "utf8");
        await fs.unlink(TEMPORAL).catch(function () {});
    }
}

// ---------- BUSCAR ----------

// Compara textos sin importar mayusculas: "AnaP" y "anap" son el mismo usuario.
function mismoTexto(a, b)
{
    return String(a).toLowerCase() === String(b).toLowerCase();
}

// Busca por la clave primaria: el numero de documento (sin importar el tipo).
async function buscarPorDocumento(documento)
{
    let lista = await leerTodos();
    return lista.find(function (s) { return s.documento === documento; }) || null;
}

// Busca por correo. Lo usan el login y la recuperacion de contrasena.
async function buscarPorCorreo(correo)
{
    let lista = await leerTodos();
    return lista.find(function (s) { return mismoTexto(s.correo, correo); }) || null;
}

// Busca por el token del enlace de confirmacion.
// Recibe el token YA CIFRADO (SHA-256), que es como esta guardado en socios.json.
async function buscarPorTokenConfirmacion(tokenCifrado)
{
    if (!tokenCifrado) return null;
    let lista = await leerTodos();
    return lista.find(function (s) { return s.tokenConfirmacion === tokenCifrado; }) || null;
}

// ---------- UNICIDAD ----------

// Pizarron - Unicos: documento, correo, usuario y celular.
// PDF - "La verificacion de unicidad siempre se hace en el servidor".
// Solo revisa los datos que vengan; el celular se revisa si reglas.js no permite repetirlo.
function esDuplicado(lista, datos)
{
    return lista.some(function (s)
    {
        return (datos.documento !== undefined && s.documento === datos.documento) ||
               (datos.correo !== undefined && mismoTexto(s.correo, datos.correo)) ||
               (datos.usuario !== undefined && mismoTexto(s.usuario, datos.usuario)) ||
               (!R.telefono.permitirRepetido && datos.telefono !== undefined && s.telefono === datos.telefono);
    });
}

// Responde solo true o false. Al usuario se le muestra un mensaje generico
// (M.general.datoRepetido) para no revelar CUAL dato ya existe.
async function existeDuplicado(datos)
{
    let lista = await leerTodos();
    return esDuplicado(lista, datos);
}

// ---------- CREAR Y ACTUALIZAR ----------

// Agrega un socio nuevo. Vuelve a revisar duplicados DENTRO de la cola:
// asi, si dos personas se registran con el mismo correo al mismo tiempo, solo entra una.
// Devuelve true si lo creo, false si algun dato ya existia.
async function crear(socio)
{
    return enCola(async function ()
    {
        let lista = await leerTodos();
        if (esDuplicado(lista, socio)) return false;

        lista.push(socio);
        await guardarTodos(lista);
        return true;
    });
}

// Cambia algunos datos de un socio (confirmado, intentos, tokens...).
// Object.assign copia los cambios encima del socio. El documento nunca cambia: es la clave.
// Devuelve el socio actualizado, o null si no existe.
async function actualizar(documento, cambios)
{
    return enCola(async function ()
    {
        let lista = await leerTodos();
        let indice = lista.findIndex(function (s) { return s.documento === documento; });
        if (indice === -1) return null;

        lista[indice] = Object.assign({}, lista[indice], cambios, { documento: documento });
        await guardarTodos(lista);
        return lista[indice];
    });
}

module.exports = {
    leerTodos,
    guardarTodos,
    buscarPorDocumento,
    buscarPorCorreo,
    buscarPorTokenConfirmacion,
    existeDuplicado,
    crear,
    actualizar
};