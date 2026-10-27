// ============================================================
// ARCHIVO: server.js
// PAPEL:   Arranca el sistema: carga el .env, revisa que socios.json se
//          pueda leer y abre el puerto. Solo arranca si los datos estan bien.
// USA:     dotenv, src/app.js, src/data/socios.repositorio.js
// LO USA:  npm run dev / npm start
// ============================================================

// Debe ir PRIMERO: llena process.env antes de que otro archivo lo necesite.
// quiet: true quita el aviso que imprime dotenv al cargar.
require("dotenv").config({ quiet: true });

const app = require("./src/app");
const repositorio = require("./src/data/socios.repositorio");

// Todo lo del .env llega como texto, por eso se convierte con Number().
const PORT = Number(process.env.PORT || 3000);

async function iniciarServidor()
{
    try
    {
        // Igual que probar la base de datos antes de arrancar: si socios.json esta danado, no se sigue.
        let socios = await repositorio.leerTodos();
        console.log("Datos listos: " + socios.length + " socio(s) registrado(s).");
    }
    catch (error)
    {
        console.error("No se pudo leer src/data/socios.json:");
        console.error(error.message);
        process.exit(1);
    }

    // Express 5 entrega en el callback el error de arranque, por ejemplo si el puerto ya esta ocupado.
    app.listen(PORT, function (error)
    {
        if (error)
        {
            console.error("No se pudo abrir el puerto " + PORT + ": " + error.message);
            process.exit(1);
        }
        console.log("Servidor disponible en http://localhost:" + PORT);
    });
}

iniciarServidor();