# Sistema de Gestión Documentaria UGEL

Aplicación web para gestión documental institucional, redacción asistida por IA (Google Gemini), bitácora del sistema y persistencia en base de datos PostgreSQL (Neon) desplegable en Vercel.

---

## 🚀 Despliegue en GitHub, Neon y Vercel

### 1. Configurar Base de Datos en Neon PostgreSQL
1. Ingresa a [neon.tech](https://neon.tech) y crea una cuenta o inicia sesión.
2. Crea un nuevo proyecto en Neon (ejemplo: `gestion-documentaria`).
3. Copia la cadena de conexión de la base de datos (`DATABASE_URL`). Tendrá un formato similar a:
   `postgresql://usuario:password@ep-xyz.pooler.region.aws.neon.tech/neondb?sslmode=require`

### 2. Subir el proyecto a GitHub
El repositorio local `git` ya está inicializado. Ejecuta los siguientes comandos en la terminal del proyecto:

```bash
# 1. Crear un repositorio en https://github.com/new llamado "gestion-documentaria"
# 2. Conectar tu repositorio local y subir los cambios:
git remote add origin https://github.com/TU_USUARIO/gestion-documentaria.git
git push -u origin main
```

### 3. Desplegar en Vercel
1. Ingresa a [vercel.com](https://vercel.com) e inicia sesión con GitHub.
2. Haz clic en **"Add New..."** ➔ **"Project"**.
3. Importa el repositorio `gestion-documentaria` recién subido.
4. En la sección **Environment Variables**, agrega las siguientes variables:
   - `DATABASE_URL`: La cadena de conexión copiada de Neon.
   - `GEMINI_API_KEY`: Tu API Key de Google Gemini (opcional pero recomendada para funciones de IA).
5. Haz clic en **Deploy**. ¡Listo!

---

## 💻 Ejecución Local

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Duplicar `.env.example` como `.env.local` y agregar tus credenciales:
   ```env
   DATABASE_URL="postgresql://usuario:clave@host/basedatos?sslmode=require"
   GEMINI_API_KEY="tu_api_key_de_gemini"
   ```
3. Iniciar el servidor local:
   ```bash
   npm run dev
   ```
4. Abrir en el navegador: [http://localhost:3000](http://localhost:3000)

