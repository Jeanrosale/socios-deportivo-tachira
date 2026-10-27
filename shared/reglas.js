// =====================================================================
// ARCHIVO: shared/reglas.js
// PAPEL:   Guarda TODOS los valores de las reglas del proyecto en un
//          solo lugar (nada cableado). Si hay que cambiar un largo, una
//          edad o un tiempo, se cambia aqui y se aplica en todo:
//          navegador, servidor y mensajes.
// LO USAN: shared/mensajes.js, shared/validaciones.js, el servidor (src/)
//          y las paginas (public/js/).
// =====================================================================

// Todo el archivo va dentro de una funcion que se ejecuta sola.
// Asi el mismo archivo sirve en el servidor (Node) y en el navegador,
// sin escribir las reglas dos veces.
(function (raiz)
{
    const REGLAS = {

        // ---------- CAMPOS DEL REGISTRO ----------

        // PDF - Nombre completo: 2 a 50 caracteres.
        nombre: { min: 2, max: 50 },

        // PDF - Nombre de usuario: 3 a 20 caracteres.
        usuario: { min: 3, max: 20 },

        // PDF - Correo: maximo 50 caracteres.
        correo: { max: 50 },

        // PDF - Documento: solo digitos, 6 a 10, segun el tipo (CC, TI, CE, PPT).
        documento: {
            min: 6,
            max: 10,
            tipos: ["CC", "TI", "CE", "PPT"],
            // Validacion cruzada (extra): TI solo para menores y CC solo para mayores.
            // CE y PPT no aparecen porque no dependen de la edad.
            soloMenores: ["TI"],
            soloMayores: ["CC"]
        },

        // PDF - Telefono: solo digitos, guardado en formato internacional.
        telefono: {
            digitos: 10,
            indicativo: "+57",
            // Pendiente de confirmar con el profesor. Por ahora no se permite repetir.
            permitirRepetido: false
        },

        // PDF - Fecha de nacimiento: edad minima del servicio.
        edad: {
            minima: 14,
            // Se usa en la validacion cruzada del documento.
            mayoria: 18
        },

        // Campos que el servidor acepta en el registro. Cualquier otro que llegue
        // (por ejemplo "confirmado": true enviado desde Postman) se ignora.
        camposRegistro: [
            "nombre", "usuario", "correo", "tipoDocumento", "documento",
            "telefono", "fechaNacimiento", "contrasena", "confirmarContrasena", "terminos"
        ],

        // ---------- CONTRASENAS ----------

        contrasena: {
            // PDF - Contrasenas: minimo 8, maximo 12.
            min: 8,
            max: 12,

            // PDF y pizarron - caracteres "diablo" que no se aceptan.
            // El \\ representa una sola barra invertida: en JavaScript se escribe doble.
            prohibidos: ["<", ">", "\\", "'", "\"", "´", "&"],

            // Pizarron - solo se acepta el nivel 4 (Fuerte, verde).
            // Los niveles cuentan cuantas cosas cumple: minuscula, mayuscula, numero, especial.
            nivelRequerido: 4,

            // Piezas del nombre, usuario o correo con menos letras que esto no se revisan en la contrasena.
            largoMinimoDato: 3,

            // PDF (y norma NIST) - contrasenas comunes o predecibles.
            // Se escriben en minuscula y sin tildes: asi se comparan (palabra base).
            comunes: [
                // Genericas, de las mas filtradas en el mundo.
                "password", "qwerty", "abc", "admin", "administrador", "welcome",
                "bienvenido", "login", "letmein", "iloveyou", "teamo", "contrasena",
                "clave", "secret", "secreto", "usuario", "user", "test", "prueba",
                "dragon", "monkey", "master", "sunshine",
                // Patrones de teclado.
                "asdf", "zxcv", "qwertyuiop", "asdfgh",
                // Del club: NIST pide rechazar el nombre del servicio y sus derivados.
                "tachira", "deportivo", "aurinegro", "aurinegros", "carrusel",
                "sancristobal", "pueblonuevo", "futbol", "socio", "amarillo",
                "negro", "venezuela"
            ]
        },

        // ---------- INICIO DE SESION ----------

        login: {
            // PDF - Limite de intentos: tras 5 fallos, esperar un minuto.
            intentosMaximos: 5,
            minutosBloqueo: 1
        },

        // ---------- VERIFICACION HUMANA (reto de imagenes en el login) ----------

        verificacion: {
            // Interruptor: false apaga el reto sin tocar el codigo.
            activa: true,
            // Cuantas imagenes se muestran (una es la correcta).
            opciones: 4,
            // Minutos que dura un reto antes de vencer. Ademas sirve una sola vez.
            minutosVigencia: 3,
            // Objetos de futbol: id interno + icono de Font Awesome (version gratuita).
            // El nombre que ve el socio (ej. "BALON") esta en mensajes.js.
            objetos: [
                { id: "balon",      icono: "fa-futbol" },
                { id: "trofeo",     icono: "fa-trophy" },
                { id: "camiseta",   icono: "fa-shirt" },
                { id: "medalla",    icono: "fa-medal" },
                { id: "bandera",    icono: "fa-flag" },
                { id: "cronometro", icono: "fa-stopwatch" }
            ]
        },

        // ---------- RECUPERACION DE CONTRASENA (codigo por correo) ----------

        recuperacion: {
            // Pizarron - "codigo 6 digitos", aleatorio y de un solo uso.
            digitosCodigo: 6,
            // PDF - "que expire (por ejemplo, 30 minutos)".
            minutosVigencia: 30,
            // Malicia: un codigo de 6 digitos tiene 1.000.000 de combinaciones.
            // Tras estos intentos fallidos el codigo se anula y hay que pedir otro.
            intentosMaximos: 5
        },

        // ---------- SESION ----------

        sesion: {
            // Profesor - la sesion se cierra tras 30 minutos sin actividad.
            // Para la demostracion se puede bajar a 1.
            minutosInactividad: 30,
            // Segundos que tiene el socio para responder "¿Deseas continuar?".
            segundosAviso: 30
        },

        // ---------- VERIFICACION EN DOS PASOS (2FA) ----------

        dosPasos: {
            // Cada cuantos ingresos se pide el codigo de Google Authenticator.
            // 1 = en cada inicio de sesion. 2 = alternado (lo pide, no lo pide...).
            ingresosEntreCodigos: 2,
            // Cantidad de codigos de respaldo que recibe el socio.
            codigosRespaldo: 8,
            // Digitos del codigo de la app (el estandar es 6).
            digitosCodigo: 6
        },

        // ---------- ENLACES ENVIADOS POR CORREO ----------

        enlaces: {
            // PDF - correo: "confirmar con enlace al correo".
            // Tambien es el plazo para borrar cuentas sin confirmar.
            horasConfirmacion: 24
        },

        // ---------- SEGURIDAD (solo la usa el servidor) ----------

        seguridad: {
            // Rondas de bcrypt: cada ronda duplica el tiempo de cifrado. Con 10 tarda milisegundos.
            rondasCifrado: 10,
            // Bytes aleatorios de cada token de enlace (32 bytes = 64 caracteres).
            bytesToken: 32
        }
    };

    // Si el archivo lo carga Node (servidor), se exporta como modulo.
    // Si lo carga el navegador, queda disponible como variable global REGLAS.
    if (typeof module !== "undefined" && module.exports)
    {
        module.exports = REGLAS;
    }
    else
    {
        raiz.REGLAS = REGLAS;
    }

})(typeof window !== "undefined" ? window : globalThis);