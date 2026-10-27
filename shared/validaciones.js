// ============================================================
// ARCHIVO: shared/validaciones.js
// PAPEL:   Reglas de validacion escritas UNA sola vez. El navegador
//          las usa para la experiencia y el servidor para la seguridad.
// USA:     shared/reglas.js (valores) y shared/mensajes.js (textos)
// LO USAN: src/validators/socio.validator.js (servidor) y
//          public/js/registro.js, login.js... (navegador)
// ============================================================

(function (raiz)
{
    // ---------- DEPENDENCIAS ----------

    // En Node se piden con require. En el navegador ya existen como variables
    // globales, porque la pagina carga reglas.js y mensajes.js ANTES que este archivo.
    const enNode = (typeof module !== "undefined" && module.exports);
    const R = enNode ? require("./reglas.js") : raiz.REGLAS;
    const M = enNode ? require("./mensajes.js") : raiz.MENSAJES;

    // Letras permitidas en el nombre: con tildes, dieresis y enie.
    const LETRAS = "A-Za-zÁÉÍÓÚÜÑáéíóúüñ";

    // ---------- RESPUESTAS ----------

    // Todas las validaciones devuelven el mismo formato: { valido, mensaje }.
    function correcto()
    {
        return { valido: true, mensaje: "" };
    }

    function incorrecto(mensaje)
    {
        return { valido: false, mensaje: mensaje };
    }

    // Un campo esta vacio si no llego o si quedo en texto vacio despues de limpiarlo.
    function estaVacio(valor)
    {
        return valor === undefined || valor === null || valor === "";
    }

    // ---------- LIMPIEZA ----------

    // PDF - "Cada campo se limpia primero (quitar espacios al inicio y al final)".
    // Malicia: si desde Postman llega algo que no es texto (numero, lista, objeto)
    // se trata como vacio, asi nunca se ejecuta trim() sobre algo raro.
    // normalize("NFC") une la tilde con su letra (algunos teclados las mandan separadas).
    function limpiarTexto(valor)
    {
        if (typeof valor !== "string") return "";
        return valor.trim().normalize("NFC");
    }

    // Arma un objeto NUEVO solo con los campos de R.camposRegistro.
    // Malicia: cualquier campo extra que mande Postman (ej: "confirmado": true) se ignora.
    function limpiarDatos(datos)
    {
        let origen = (datos && typeof datos === "object") ? datos : {};
        let limpio = {};

        R.camposRegistro.forEach(function (campo)
        {
            let valor = origen[campo];

            if (campo === "contrasena" || campo === "confirmarContrasena")
            {
                // PDF - "quitar espacios al correo, pero nunca a la contrasena".
                limpio[campo] = (typeof valor === "string") ? valor : "";
            }
            else if (campo === "terminos")
            {
                // Se deja tal cual llego: luego se exige true exacto (no "true", no 1).
                limpio[campo] = valor;
            }
            else
            {
                limpio[campo] = limpiarTexto(valor);
            }
        });

        // Espacios repetidos dentro del nombre: "Jose    Perez" -> "Jose Perez".
        limpio.nombre = limpio.nombre.replace(/\s+/g, " ");

        // PDF - correo: "convertir a minusculas".
        limpio.correo = limpio.correo.toLowerCase();

        return limpio;
    }

    // ---------- CAMPOS DE TEXTO ----------

    // PDF - Nombre: 2 a 50 caracteres; letras con tildes, enie, espacios, guion y apostrofo.
    // Debe empezar y terminar en letra, para que "--" o "' '" no pasen como nombre.
    // Se aceptan los dos apostrofos: el recto (') y el curvo (’) que ponen los celulares.
    function validarNombre(nombre)
    {
        if (estaVacio(nombre)) return incorrecto(M.general.obligatorio);

        if (nombre.length < R.nombre.min || nombre.length > R.nombre.max)
        {
            return incorrecto(M.campos.nombre);
        }

        let patron = new RegExp("^[" + LETRAS + "]([" + LETRAS + " '’-]*[" + LETRAS + "])?$");
        if (!patron.test(nombre)) return incorrecto(M.campos.nombre);

        return correcto();
    }

    // PDF - Usuario: 3 a 20 caracteres; solo letras, numeros, guion y guion bajo.
    // El largo sale de reglas.js, por eso la expresion se arma con new RegExp.
    function validarUsuario(usuario)
    {
        if (estaVacio(usuario)) return incorrecto(M.general.obligatorio);

        let patron = new RegExp("^[A-Za-z0-9_-]{" + R.usuario.min + "," + R.usuario.max + "}$");
        if (!patron.test(usuario)) return incorrecto(M.campos.usuario);

        return correcto();
    }

    // PDF - Correo: formato valido y maximo 50 caracteres.
    // El dominio puede tener varias partes: ana@colegio.edu.co
    // Malicia: se rechazan dos puntos seguidos ("ana..b@x.com").
    function validarCorreo(correo)
    {
        if (estaVacio(correo)) return incorrecto(M.general.obligatorio);

        if (correo.length > R.correo.max) return incorrecto(M.campos.correo);

        let patron = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;
        if (!patron.test(correo) || correo.includes("..")) return incorrecto(M.campos.correo);

        return correcto();
    }

    // PDF - Tipo de documento: solo los de la lista (CC, TI, CE, PPT).
    function validarTipoDocumento(tipo)
    {
        if (estaVacio(tipo)) return incorrecto(M.general.obligatorio);

        if (!R.documento.tipos.includes(tipo)) return incorrecto(M.campos.tipoDocumento);

        return correcto();
    }

    // PDF - Documento: solo digitos, entre 6 y 10.
    function validarDocumento(documento)
    {
        if (estaVacio(documento)) return incorrecto(M.general.obligatorio);

        let patron = new RegExp("^\\d{" + R.documento.min + "," + R.documento.max + "}$");
        if (!patron.test(documento)) return incorrecto(M.campos.documento);

        return correcto();
    }

    // PDF - Telefono: solo digitos, longitud segun el pais (10 en Colombia).
    function validarTelefono(telefono)
    {
        if (estaVacio(telefono)) return incorrecto(M.general.obligatorio);

        let patron = new RegExp("^\\d{" + R.telefono.digitos + "}$");
        if (!patron.test(telefono)) return incorrecto(M.campos.telefono);

        return correcto();
    }

    // PDF - "guardar en formato internacional (+57...)". Se usa al guardar, no al validar.
    function formatoInternacional(telefono)
    {
        return R.telefono.indicativo + telefono;
    }

    // ---------- FECHA Y EDAD ----------

    // Devuelve la fecha de hoy como texto AAAA-MM-DD (hora local).
    // Asi se puede comparar con la fecha de nacimiento como texto: "2026-10-19" > "2010-05-03".
    function hoyComoTexto()
    {
        let hoy = new Date();
        let mes = String(hoy.getMonth() + 1).padStart(2, "0");
        let dia = String(hoy.getDate()).padStart(2, "0");
        return hoy.getFullYear() + "-" + mes + "-" + dia;
    }

    // PDF - "Fecha real": revisa el formato AAAA-MM-DD y que el dia exista en el calendario.
    // Malicia: "2023-02-30" tiene buen formato, pero no existe. Date la corre al 2 de marzo,
    // por eso se compara lo que Date armo contra lo que se escribio.
    function esFechaReal(fecha)
    {
        if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;

        let partes = fecha.split("-").map(Number);
        let anio = partes[0], mes = partes[1], dia = partes[2];

        // Date.UTC evita que la zona horaria mueva el dia.
        let armada = new Date(Date.UTC(anio, mes - 1, dia));
        return armada.getUTCFullYear() === anio &&
               armada.getUTCMonth() === mes - 1 &&
               armada.getUTCDate() === dia;
    }

    // Calcula los anos cumplidos. Si este ano aun no llega el cumpleanos, se resta 1.
    function calcularEdad(fecha)
    {
        let partes = fecha.split("-").map(Number);
        let hoy = new Date();

        let edad = hoy.getFullYear() - partes[0];
        let mesHoy = hoy.getMonth() + 1;
        let noHaCumplido = (mesHoy < partes[1]) ||
                           (mesHoy === partes[1] && hoy.getDate() < partes[2]);
        if (noHaCumplido) edad--;

        return edad;
    }

    // PDF - Fecha de nacimiento: fecha real, no futura y con la edad minima (14).
    // El orden importa: primero el formato, porque sin fecha real no se puede calcular la edad.
    function validarFechaNacimiento(fecha)
    {
        if (estaVacio(fecha)) return incorrecto(M.general.obligatorio);

        if (!esFechaReal(fecha)) return incorrecto(M.campos.fechaInvalida);

        if (fecha > hoyComoTexto()) return incorrecto(M.campos.fechaFutura);

        if (calcularEdad(fecha) < R.edad.minima) return incorrecto(M.campos.edadMinima);

        return correcto();
    }

    // ---------- TERMINOS ----------

    // PDF - "Casilla marcada". Malicia: desde Postman pueden mandar "true", 1 o "si".
    // Solo se acepta el booleano true exacto (===).
    function validarTerminos(terminos)
    {
        if (terminos !== true) return incorrecto(M.campos.terminos);
        return correcto();
    }

    // ---------- VALIDACION CRUZADA ----------

    // Pizarron - El tipo de documento debe cuadrar con la edad:
    // mayor de 18 no puede usar TI; menor de 18 no puede usar CC; CE y PPT son libres.
    // Se llama solo cuando el tipo y la fecha ya pasaron su propia validacion.
    function validarDocumentoSegunEdad(tipoDocumento, fecha)
    {
        let esMayor = calcularEdad(fecha) >= R.edad.mayoria;

        if (esMayor && R.documento.soloMenores.includes(tipoDocumento))
        {
            return incorrecto(M.campos.tiSiendoMayor);
        }

        if (!esMayor && R.documento.soloMayores.includes(tipoDocumento))
        {
            return incorrecto(M.campos.ccSiendoMenor);
        }

        return correcto();
    }

    // ---------- CONTRASENA ----------

    // Palabra base de un texto: minusculas, sin tildes y SOLO letras.
    // "Contrasena123!" -> "contrasena"   "Tachira_2026" -> "tachira"
    // Malicia: asi "TACHIRA2026" o "Tachira#1" no se escapan de la lista de comunes.
    function palabraBase(texto)
    {
        if (typeof texto !== "string") return "";
        return texto.toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // separa la tilde y la borra
                    .replace(/[^a-z]/g, "");                            // borra numeros, simbolos y espacios
    }

    // Requisitos que cuenta el medidor. Las claves son las mismas que espera M.contrasena.faltantes.
    // Especial = cualquier cosa que no sea letra, numero ni espacio.
    const REQUISITOS = {
        minuscula: /[a-záéíóúüñ]/,
        mayuscula: /[A-ZÁÉÍÓÚÜÑ]/,
        numero: /[0-9]/,
        especial: /[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s]/
    };

    // PDF - "Mostrar un medidor de fortaleza".
    // Nivel = cuantos requisitos cumple (1 Debil, 2 Media, 3 Aceptable, 4 Fuerte).
    // Tambien dice exactamente que falta y cuantos caracteres faltan para el minimo.
    // PDF - "Mostrar un medidor de fortaleza".
    // Nivel = cuantos requisitos cumple (1 Debil, 2 Media, 3 Aceptable, 4 Fuerte).
    // Tambien dice exactamente que falta y cuantos caracteres faltan para el minimo.
    // Si se pasa del maximo: barra roja y dice cuantos sobran. Nunca verde si el servidor la rechazaria.
    function medirContrasena(contrasena)
    {
        let texto = (typeof contrasena === "string") ? contrasena : "";
        let claves = Object.keys(REQUISITOS);

        let faltantes = claves.filter(function (clave)
        {
            return !REQUISITOS[clave].test(texto);
        });

        let caracteresFaltantes = Math.max(0, R.contrasena.min - texto.length);
        let caracteresSobrantes = Math.max(0, texto.length - R.contrasena.max);

        // Mas de 12: se muestra como nivel 1 (rojo) y sin la palabra "Debil".
        if (caracteresSobrantes > 0)
        {
            return {
                nivel: 1,
                texto: "",
                faltantes: faltantes,
                caracteresFaltantes: 0,
                mensaje: M.contrasena.sobrantes(caracteresSobrantes)
            };
        }

        let nivel = claves.length - faltantes.length;
        let mensaje = (faltantes.length === 0 && caracteresFaltantes === 0)
            ? M.contrasena.aceptada
            : M.contrasena.faltantes(faltantes, caracteresFaltantes);

        return {
            nivel: nivel,
            texto: M.contrasena.niveles[nivel],
            faltantes: faltantes,
            caracteresFaltantes: caracteresFaltantes,
            mensaje: mensaje
        };
    }

    // Revisa si la contrasena contiene el usuario, lo que va antes de la @ del correo
    // o alguna palabra del nombre. Todo se compara en palabra base, asi "Juan#2026"
    // tambien cae si el usuario es "juan_23".
    function contieneDatosPersonales(base, datos)
    {
        let d = datos || {};
        let piezas = [];

        if (typeof d.usuario === "string") piezas.push(d.usuario);
        if (typeof d.correo === "string") piezas.push(d.correo.split("@")[0]);
        if (typeof d.nombre === "string") piezas = piezas.concat(d.nombre.split(/[\s'’-]+/));

        return piezas
            .map(palabraBase)
            .filter(function (p) { return p.length >= R.contrasena.largoMinimoDato; })
            .some(function (p) { return base.includes(p); });
    }

    // PDF - Contrasenas. Va de lo mas basico a lo mas fino; se devuelve el primer error.
    // datos = { nombre, usuario, correo } ya limpios.
    // La contrasena NUNCA se limpia: un espacio tambien es parte de ella.
    function validarContrasena(contrasena, datos)
    {
        if (estaVacio(contrasena)) return incorrecto(M.general.obligatorio);

        // PDF - "Minimo 8 caracteres; Maximo 12".
        if (contrasena.length < R.contrasena.min || contrasena.length > R.contrasena.max)
        {
            return incorrecto(M.contrasena.largo);
        }

        // PDF - "No aceptar estos caracteres".
        let tieneProhibido = R.contrasena.prohibidos.some(function (c)
        {
            return contrasena.includes(c);
        });
        if (tieneProhibido) return incorrecto(M.contrasena.prohibidos);

        // Pizarron - nivel Fuerte obligatorio.
        if (medirContrasena(contrasena).nivel < R.contrasena.nivelRequerido)
        {
            return incorrecto(M.contrasena.noFuerte);
        }

        // PDF - "Rechazar contrasenas comunes o filtradas".
        let base = palabraBase(contrasena);
        if (R.contrasena.comunes.includes(base)) return incorrecto(M.contrasena.comun);

        // PDF - "Rechazar contrasenas que contengan el nombre, el usuario o el correo".
        if (contieneDatosPersonales(base, datos)) return incorrecto(M.contrasena.datosPersonales);

        return correcto();
    }

    // PDF - "Pedir Confirmar contrasena y verificar que coincidan". Comparacion exacta.
    function validarConfirmacion(contrasena, confirmar)
    {
        if (estaVacio(confirmar)) return incorrecto(M.general.obligatorio);
        if (contrasena !== confirmar) return incorrecto(M.contrasena.noCoinciden);
        return correcto();
    }

    // ---------- REGISTRO COMPLETO ----------

    // Limpia y valida TODO el formulario de una vez.
    // Devuelve { valido, errores, datos }:
    //   errores -> un mensaje por campo, para mostrarlo debajo de su casilla.
    //   datos   -> la version limpia, que es la que se guarda.
    // La unicidad (documento, correo, usuario, celular) NO va aqui: solo el servidor puede revisarla.
    function validarRegistro(datosRecibidos)
    {
        let d = limpiarDatos(datosRecibidos);
        let errores = {};

        let resultados = {
            nombre: validarNombre(d.nombre),
            usuario: validarUsuario(d.usuario),
            correo: validarCorreo(d.correo),
            tipoDocumento: validarTipoDocumento(d.tipoDocumento),
            documento: validarDocumento(d.documento),
            telefono: validarTelefono(d.telefono),
            fechaNacimiento: validarFechaNacimiento(d.fechaNacimiento),
            contrasena: validarContrasena(d.contrasena, d),
            confirmarContrasena: validarConfirmacion(d.contrasena, d.confirmarContrasena),
            terminos: validarTerminos(d.terminos)
        };

        Object.keys(resultados).forEach(function (campo)
        {
            if (!resultados[campo].valido) errores[campo] = resultados[campo].mensaje;
        });

        // Pizarron - cruzada: solo si el tipo y la fecha ya pasaron, porque necesita la edad real.
        if (resultados.tipoDocumento.valido && resultados.fechaNacimiento.valido)
        {
            let cruzada = validarDocumentoSegunEdad(d.tipoDocumento, d.fechaNacimiento);
                        if (!cruzada.valido) errores.tipoDocumento = cruzada.mensaje;
        }

        return { valido: Object.keys(errores).length === 0, errores: errores, datos: d };
    }

    // ---------- EXPORTAR ----------

    const VALIDACIONES = {
        limpiarTexto: limpiarTexto,
        limpiarDatos: limpiarDatos,
        validarNombre: validarNombre,
        validarUsuario: validarUsuario,
        validarCorreo: validarCorreo,
        validarTipoDocumento: validarTipoDocumento,
        validarDocumento: validarDocumento,
        validarTelefono: validarTelefono,
        formatoInternacional: formatoInternacional,
        esFechaReal: esFechaReal,
        calcularEdad: calcularEdad,
        validarFechaNacimiento: validarFechaNacimiento,
        validarTerminos: validarTerminos,
        validarDocumentoSegunEdad: validarDocumentoSegunEdad,
        palabraBase: palabraBase,
        medirContrasena: medirContrasena,
        validarContrasena: validarContrasena,
        validarConfirmacion: validarConfirmacion,
        validarRegistro: validarRegistro
    };

    // Igual que reglas.js y mensajes.js: modulo en Node, variable global en el navegador.
    if (typeof module !== "undefined" && module.exports)
    {
        module.exports = VALIDACIONES;
    }
    else
    {
        raiz.VALIDACIONES = VALIDACIONES;
    }

})(typeof window !== "undefined" ? window : globalThis);