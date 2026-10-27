# Socios Deportivo Tachira

Proyecto academico (CEOGET): registro e inicio de sesion de socios del Deportivo Tachira, aplicando buenas practicas de validacion en cliente y servidor.

## Funcionalidades

- Registro de socios con validacion en el navegador y en el servidor.
- Medidor de fortaleza de contrasena y boton para ver u ocultar el texto.
- Inicio de sesion en ventana emergente, con mensaje generico y bloqueo tras 5 intentos fallidos.
- Portal del Socio con bienvenida, ultimo ingreso y carnet digital.
- Terminos y condiciones con descarga en PDF.
- Cierre de sesion por inactividad (30 minutos).

## Tecnologias

- Node.js v24
- Express 5
- express-session
- bcryptjs (cifrado de contrasenas)
- dotenv
- nodemon (desarrollo)

## Instalacion

1. Clonar el repositorio:

   ```
   git clone https://github.com/Jeanrosale/socios-deportivo-tachira.git
   cd socios-deportivo-tachira
   ```

2. Instalar dependencias:

   ```
   npm install
   ```

3. Crear el archivo `.env` a partir de la plantilla y llenar los valores:

   ```
   Copy-Item .env.example .env
   ```

4. Iniciar el servidor:

   ```
   npm run dev
   ```

5. Abrir en el navegador: `http://localhost:3000/registro.html`

El archivo de datos `src/data/socios.json` no se sube al repositorio. Se crea vacio automaticamente la primera vez que arranca el servidor.

## Estructura

```
├── shared/          reglas, mensajes y validaciones (cliente y servidor)
├── src/
│   ├── data/        repositorio de socios (socios.json se crea solo)
│   ├── validators/  validacion del registro
│   ├── services/    seguridad (cifrado, intentos)
│   ├── controllers/ registro y login
│   ├── rutas.js
│   └── app.js
├── public/          paginas, estilos y scripts del navegador
└── server.js        arranque del servidor
```

## Endpoints

| Metodo | Ruta          | Funcion                    |
| ------ | ------------- | -------------------------- |
| GET    | /api          | Prueba de funcionamiento   |
| POST   | /api/registro | Registrar socio            |
| POST   | /api/login    | Iniciar sesion             |
| GET    | /api/perfil   | Datos del socio con sesion |
| POST   | /api/salir    | Cerrar sesion              |

## Pendiente

- Confirmacion de correo con Gmail
- Verificacion en 2 pasos
- Recuperar contrasena
- Pruebas con Postman