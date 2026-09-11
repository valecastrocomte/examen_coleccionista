# Sistema de Gestión de Colecciones de Láminas

Aplicación web (arquitectura **MVC**) para que coleccionistas gestionen sus álbumes y láminas: crear álbumes, cargar láminas por listado, marcar faltantes y repetidas, y subir fotos. Incluye **API REST** y una **interfaz web oscura y profesional** hecha con Bootstrap.

## Stack

| Capa | Tecnología |
|---|---|
| Lenguaje / Runtime | TypeScript · Node.js LTS |
| Framework | Hono 4.13.x |
| ORM / BD | Prisma 7.x · MySQL 8.x |
| Vistas | EJS + Bootstrap 5.3.x (tema oscuro) |
| Validación / Tests | Zod · Vitest |

Arquitectura **MVC**: `models` (Prisma + Zod) → `controllers` → `views` (EJS + Bootstrap). La API REST vive en `/api/*` y la web MVC en el resto de rutas, compartiendo la misma lógica.

---

## Requisitos previos

1. [Node.js](https://nodejs.org) LTS (v22 o superior).
2. [MySQL](https://dev.mysql.com/downloads/) 8.x corriendo en local.
3. `npm` (viene con Node).

---

## Puesta en marcha (paso a paso)

### 1. Instalar dependencias

```bash
npm install
```

> Bootstrap se instala vía npm y sus archivos se copian a `public/vendor/bootstrap/`. Si no se copiaron automáticamente, ejecutar el script de post-instalación (ver [Resumen de comandos](#resumen-de-comandos)).

### 2. Configurar la base de datos

Crear el archivo `.env` (copiar desde `.env.example`) y completar las credenciales:

```env
DATABASE_URL="mysql://usuario:password@localhost:3306/examen_coleccionista"
PUERTO=3000
```

### 3. Crear el esquema y datos de ejemplo

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Levantar la aplicación

```bash
npm run dev
```

Abrir en el navegador:

- **Web (MVC):** http://localhost:3000/albumes
- **API REST:** http://localhost:3000/api/albumes

---

## Resumen de comandos

| Comando | Qué hace |
|---|---|
| `npm install` | Instala todas las dependencias |
| `npm run dev` | Levanta el servidor en modo desarrollo (recarga automática) |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Ejecuta el build compilado (producción) |
| `npm test` | Ejecuta los tests de la lógica de negocio |
| `npm run bootstrap` | Copia Bootstrap de `node_modules/` a `public/vendor/bootstrap/` |
| `npx prisma migrate dev` | Aplica los cambios del esquema a MySQL |
| `npx prisma migrate dev --name init` | Crea el esquema inicial |
| `npx prisma generate` | Regenera el cliente Prisma tras cambiar el esquema |
| `npx prisma db seed` | Carga datos de ejemplo |
| `npx prisma studio` | Abre el explorador visual de la base de datos |

> Si un comando nuevo se agrega a `package.json`, este apartado se actualiza (ver `AGENT.md`).

---

## Documentación del proyecto

| Archivo | Contenido |
|---|---|
| [`docs/BRIEF.md`](docs/BRIEF.md) | Requerimientos, reglas de negocio, modelo de datos y decisiones |
| [`docs/stack.md`](docs/stack.md) | Stack tecnológico detallado y justificación |
| [`docs/API.md`](docs/API.md) | Guía de consumo de la API: endpoints, Request/Response |
| [`docs/INFORME_PRUEBAS.md`](docs/INFORME_PRUEBAS.md) | Informe de pruebas con screenshots |
| [`style.md`](style.md) | Guía de estilos de la interfaz (tema oscuro profesional) |
| [`roadmap.md`](roadmap.md) | Fases de implementación y avance |
| [`AGENT.md`](AGENT.md) | Reglas para agentes de IA y colaboradores |

---

## Estructura del proyecto

```
.
├── docs/                    # Brief, stack, API, informe de pruebas
├── prisma/
│   ├── schema.prisma        # Modelos Album y Lamina
│   ├── migrations/          # Migraciones versionadas
│   └── seed.ts              # Datos de ejemplo
├── src/
│   ├── index.ts             # Arranque del servidor
│   ├── app.ts               # App Hono: middleware, estáticos, rutas
│   ├── db.ts                # Instancia única de PrismaClient
│   ├── models/              # Queries Prisma + esquemas Zod (MODELO)
│   ├── controllers/         # Lógica por petición, JSON y HTML (CONTROLADOR)
│   ├── views/               # Plantillas EJS + Bootstrap (VISTA)
│   ├── public/vendor/bootstrap/  # Assets de Bootstrap (tema oscuro)
│   └── lib/upload.ts        # Subida de fotos
├── tests/                   # Tests Vitest
├── uploads/                 # Fotos subidas
├── README.md                # Este archivo
├── style.md
├── roadmap.md
└── AGENT.md
```