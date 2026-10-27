// =====================================================================
// ARCHIVO: shared/mensajes.js
// PAPEL:   Guarda TODOS los textos que ve el socio. Los numeros no se
//          escriben a mano: se toman de reglas.js. Si una regla cambia,
//          el mensaje cambia solo (nada cableado).
// USA:     shared/reglas.js
// LO USAN: shared/validaciones.js, el servidor (src/) y las paginas (public/js/).
// =====================================================================

(function (raiz)
{
    // En el servidor se importan las reglas con require.
    // En el navegador ya estan cargadas como variable global (reglas.js va antes).
    const R = (typeof module !== "undefined" && module.exports)
        ? require("./reglas.js")
        : raiz.REGLAS;

    // ---------- FUNCIONES DE APOYO ----------

    // Une una lista de textos con comas y una "y" al final.
    // Ejemplo: ["a", "b", "c"] -> "a, b y c"
    function unirConY(lista)
    {
        if (lista.length <= 1) return lista.join("");
        return lista.slice(0, -1).join(", ") + " y " + lista[lista.length - 1];
    }

    // Traduce cada requisito que le falta a la contrasena a un texto claro.
    // validaciones.js entrega las claves; aqui se convierten en palabras.
    const TEXTO_REQUISITO = {
        minuscula: "una letra minúscula",
        mayuscula: "una letra mayúscula",
        numero: "un número",
        especial: "un carácter especial, como ! o #"
    };

    const MENSAJES = {

        // ---------- GENERALES ----------

        general: {
            // Un solo mensaje para cualquier campo vacio o con solo espacios.
            obligatorio: "Este campo es obligatorio",
            // Se usa cuando algo falla DENTRO del servidor. Nunca se muestra el detalle tecnico.
            errorServidor: "Ocurrió un error. Intenta de nuevo más tarde",
            // No dice cual dato esta repetido, para no revelar quien es socio.
            datoRepetido: "Ya existe una cuenta con alguno de estos datos",
            // Malicia: llega un JSON mal escrito o demasiado grande (por ejemplo desde Postman).
            peticionInvalida: "La información enviada no tiene un formato válido",
            // Se muestra arriba del formulario cuando uno o mas campos tienen error.
            revisarCampos: "Revisa los campos marcados"
        },

        // ---------- CAMPOS DEL REGISTRO ----------

        campos: {
            // PDF - mensajes sugeridos por la guia, con los numeros tomados de reglas.js.
            nombre: `Escribe un nombre válido de ${R.nombre.min} a ${R.nombre.max} letras`,
            usuario: `Usa de ${R.usuario.min} a ${R.usuario.max} letras, números, - o _`,
            correo: "Ingresa un correo válido, por ejemplo nombre@dominio.com",
            documento: `El documento debe tener entre ${R.documento.min} y ${R.documento.max} dígitos`,
            telefono: `Ingresa un número de ${R.telefono.digitos} dígitos`,
            edadMinima: `Debes tener al menos ${R.edad.minima} años`,
            terminos: "Debes aceptar los términos para continuar",

            // Propios del proyecto.
            // El selector ya lo impide; este mensaje es para quien envie otro valor desde Postman.
            tipoDocumento: "Selecciona un tipo de documento válido",
            fechaInvalida: "Ingresa una fecha de nacimiento válida",
            fechaFutura: "La fecha de nacimiento no puede ser futura",

            // Validacion cruzada: tipo de documento contra edad.
            tiSiendoMayor: `La tarjeta de identidad es para menores de ${R.edad.mayoria} años; si eres mayor, elige cédula`,
            ccSiendoMenor: `La cédula es para mayores de ${R.edad.mayoria} años; si eres menor, elige tarjeta de identidad`
        },

        // ---------- CONTRASENAS ----------

        contrasena: {
            largo: `La contraseña debe tener entre ${R.contrasena.min} y ${R.contrasena.max} caracteres`,
            // Se muestran los caracteres prohibidos tomados de reglas.js, separados por espacios.
            prohibidos: `La contraseña no puede contener estos caracteres: ${R.contrasena.prohibidos.join(" ")}`,
            comun: "Esta contraseña es muy común y fácil de adivinar; elige otra",
            datosPersonales: "La contraseña no puede contener tu nombre, usuario ni correo",
            noFuerte: "La contraseña debe llegar al nivel Fuerte para continuar",
            noCoinciden: "Las contraseñas no coinciden",
            noPegar: "Escribe la contraseña de nuevo; aquí no se permite pegar",

            // Pizarron - nombres de los 4 niveles del medidor.
            // La posicion 0 queda vacia para que el nivel 1 sea niveles[1].
            niveles: ["", "Débil", "Media", "Aceptable", "Fuerte"],
            aceptada: "¡Contraseña aceptada!",

            // Si se pasa del maximo: dice cuantos caracteres sobran.
            sobrantes: function (cantidad)
            {
                return "Tiene más de " + R.contrasena.max + " caracteres: quita " + cantidad +
                    (cantidad === 1 ? " carácter" : " caracteres");
            },

            // Arma el mensaje del medidor con lo que falta EXACTAMENTE.
            // requisitos: claves que faltan, por ejemplo ["mayuscula", "especial"].
            // caracteresFaltantes: cuantos caracteres faltan para el minimo (0 si ya cumple).
            faltantes: function (requisitos, caracteresFaltantes)
            {
                let partes = requisitos.map(function (clave) { return TEXTO_REQUISITO[clave]; });

                if (caracteresFaltantes > 0)
                {
                    let texto = (caracteresFaltantes === 1)
                        ? "1 carácter más"
                        : caracteresFaltantes + " caracteres más";
                    partes.push(texto);
                }

                return "Te falta: " + unirConY(partes);
            }
        },

        // ---------- REGISTRO Y CONFIRMACION ----------

        registro: {
            exito: "Registro exitoso. Revisa tu correo para confirmar tu cuenta",
            // Si Gmail falla: el registro queda guardado y el socio puede pedir el reenvio.
            envioFallido: "Tu registro quedó guardado, pero no pudimos enviar el correo de confirmación. Solicita un nuevo enlace",
            confirmada: "Cuenta confirmada, ya puedes iniciar sesión",
            enlaceInvalido: "El enlace no es válido o ya venció. Solicita uno nuevo",
            // Mensaje generico: no revela si el correo existe.
            reenvio: "Si el correo está registrado y sin confirmar, recibirás un nuevo enlace"
        },

        // ---------- INICIO DE SESION Y SESION ----------

        login: {
            // PDF - mensaje generico: nunca dice cual de los dos fallo.
            incorrecto: "Correo o contraseña incorrectos",
            bloqueado: `Demasiados intentos. Espera ${R.login.minutosBloqueo} minuto(s) e intenta de nuevo`,
            // Solo se muestra si la contrasena fue correcta, para no revelar nada a un extrano.
            sinConfirmar: "Tu cuenta aún no está confirmada. Revisa tu correo o solicita un nuevo enlace",
            sesionVencida: "Tu sesión se cerró por inactividad. Inicia sesión de nuevo",
            sesionCerrada: "Sesión cerrada correctamente",
            avisoSesion: "Tu sesión está por cerrarse por inactividad. ¿Deseas continuar?"
        },

        // ---------- VERIFICACION HUMANA (reto de imagenes en el login) ----------

        verificacion: {
            // Va antes del nombre del objeto: "Selecciona la imagen de BALON".
            instruccion: "Selecciona la imagen de",
            // Nombre que ve el socio de cada objeto. Las claves son los id de reglas.js.
            nombres: {
                balon: "BALÓN",
                trofeo: "TROFEO",
                camiseta: "CAMISETA",
                medalla: "MEDALLA",
                bandera: "BANDERA",
                cronometro: "CRONÓMETRO"
            },
            sinSeleccion: "Selecciona una imagen para continuar",
            // Un solo mensaje para respuesta incorrecta o reto vencido:
            // asi no se le da pistas a un programa automatico.
            incorrecta: "La verificación no es correcta o venció. Intenta con las nuevas imágenes",
            // Texto de ayuda del boton de recargar (se ve al pasar el mouse).
            recargar: "Cambiar imágenes"
        },

        // ---------- VERIFICACION EN DOS PASOS (2FA) ----------

        dosPasos: {
            instruccionQR: `Escanea este código con Google Authenticator y escribe los ${R.dosPasos.digitosCodigo} dígitos que aparecen en la app`,
            pedirCodigo: `Escribe el código de ${R.dosPasos.digitosCodigo} dígitos que muestra Google Authenticator`,
            codigoIncorrecto: "Código incorrecto. Revisa la app e intenta de nuevo",
            guardarRespaldo: "Guarda estos códigos en un lugar seguro. Cada uno sirve una sola vez si pierdes tu celular. No se volverán a mostrar",
            sinCelular: "¿No tienes tu celular? Usa un código de respaldo",

            // Recibe cuantos codigos de respaldo le quedan al socio.
            respaldoAceptado: function (restantes)
            {
                return "Código de respaldo aceptado. Te quedan " + restantes;
            }
        },

        // ---------- RECUPERACION DE CONTRASENA (codigo por correo) ----------

        recuperacion: {
            // PDF - mismo mensaje exista o no el correo (adaptado: codigo en vez de enlace).
            solicitud: "Si el correo está registrado, recibirás un código",
            instruccionCodigo: `Escribe el código de ${R.recuperacion.digitosCodigo} dígitos que llegó a tu correo`,
            codigoFormato: `El código debe tener ${R.recuperacion.digitosCodigo} dígitos`,
            // Un solo mensaje para codigo errado, vencido, ya usado o anulado por intentos:
            // asi no se le da pistas a quien intente adivinarlo.
            codigoInvalido: "El código no es válido o ya venció. Revisa tu correo o solicita uno nuevo",
            actualizada: "Contraseña actualizada. Ya puedes iniciar sesión"
        },

        // ---------- CORREOS QUE SE ENVIAN ----------

        correos: {
            // Nombre que ve el socio como remitente (la direccion sale del .env).
            remitente: "Deportivo Táchira – Socios",
            // Pie comun de todos los correos.
            avisoAcademico: "Proyecto académico de validación de datos. No pertenece al club Deportivo Táchira.",

            confirmacion: {
                asunto: "Confirma tu cuenta de socio – Deportivo Táchira",
                titulo: "Confirma tu cuenta",
                saludo: function (nombre) { return "Hola, " + nombre + ":"; },
                texto: "Gracias por registrarte como socio. Para activar tu cuenta, pulsa el botón:",
                boton: "Confirmar mi cuenta",
                vence: `El enlace vence en ${R.enlaces.horasConfirmacion} horas.`,
                ignorar: "Si no te registraste, ignora este mensaje: la cuenta no se activará."
            },

            recuperacion: {
                asunto: "Código para restablecer tu contraseña – Deportivo Táchira",
                titulo: "Restablece tu contraseña",
                saludo: function (nombre) { return "Hola, " + nombre + ":"; },
                texto: "Recibimos una solicitud para cambiar tu contraseña. Tu código es:",
                vence: `El código vence en ${R.recuperacion.minutosVigencia} minutos y sirve una sola vez.`,
                ignorar: "Si no lo solicitaste, ignora este mensaje: tu contraseña sigue igual."
            }
        }
    };

    // Igual que en reglas.js: modulo en Node, variable global en el navegador.
    if (typeof module !== "undefined" && module.exports)
    {
        module.exports = MENSAJES;
    }
    else
    {
        raiz.MENSAJES = MENSAJES;
    }

})(typeof window !== "undefined" ? window : globalThis);