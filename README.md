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
2. [MySQL](https://dev.mysql.com/downloads/) 8.x, **o** Docker Desktop (para levantar el MySQL incluido en `docker-compose.yml`).
3. `npm` (viene con Node).

---

## Puesta en marcha (paso a paso)

### 1. Levantar MySQL

```bash
docker compose up -d
```

> Crea el contenedor `examen-mysql` con MySQL 8.4 en `localhost:3306` (usuario `root`, password `root`, base `examen_coleccionista`). Si ya tenés un MySQL 8.x instalado en local, podés saltear este paso y usar tus propias credenciales en `.env`.

---

### 2. Instalar dependencias

```bash
npm install
```

> Bootstrap se instala vía npm y sus archivos se copian a `public/vendor/bootstrap/`. Si no se copiaron automáticamente, ejecutar el script de post-instalación (ver [Resumen de comandos](#resumen-de-comandos)).

### 3. Configurar la base de datos

Crear el archivo `.env` (copiar desde `.env.example`) y completar las credenciales:

```env
DATABASE_URL="mysql://root:root@localhost:3306/examen_coleccionista?allowPublicKeyRetrieval=true"
PUERTO=3000
```

### 4. Crear el esquema y datos de ejemplo

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Levantar la aplicación

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
| `docker compose up -d` | Levanta MySQL 8.4 en localhost:3306 |
| `docker compose down` | Detiene MySQL |
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
| [`docs/style.md`](docs/style.md) | Guía de estilos de la interfaz (tema oscuro profesional) |
| [`docs/roadmap.md`](docs/roadmap.md) | Fases de implementación y avance |
| [`AGENT.md`](AGENT.md) | Reglas para agentes de IA y colaboradores |

---

## Estructura del proyecto

.
├── docs/                        # Brief, stack, API, style e informe de pruebas
├── prisma/
│   ├── schema.prisma            # Esquema Prisma (modelos Album, Lamina, enum TipoLamina)
│   ├── migrations/              # Migraciones versionadas (init en Fase 1)
│   └── seed.ts                  # Datos de ejemplo: 1 álbum + láminas (estados 0/1/≥2)
├── prisma7.config.ts            # Configuración Prisma 7 (URL, migraciones, seed)
├── src/
│   ├── index.ts                 # Arranque del servidor
│   ├── app.ts                   # App Hono: middleware, estáticos y rutas (API + web)
│   ├── db.ts                    # Instancia única de PrismaClient (MySQL)
│   ├── models/                  # Esquemas Zod + queries Prisma (album, lamina, parametros)
│   ├── controllers/             # API JSON (/api/*) y web MVC (mismos models)
│   ├── lib/                     # errores.ts (JSON uniforme) · validacion.ts (Zod) · vistas.ts (EJS)
│   ├── views/                   # Plantillas EJS: partials/, albumes/, laminas/
│   ├── generated/prisma/        # Cliente Prisma generado (no editar)
│   └── uploads/                 # Fotos subidas (en gitignore)
├── public/
│   ├── css/app.css              # Tema oscuro (paleta de docs/style.md §2)
│   └── vendor/bootstrap/        # Assets de Bootstrap (`npm run bootstrap`)
├── scripts/
│   └── copiar-bootstrap.mjs     # Copia Bootstrap de node_modules/ a public/
├── tests/
│   ├── smoke.test.ts            # Test de humo (Fase 0): redirect y estáticos
│   ├── api.test.ts              # Tests CRUD de la API (Fase 2) contra MySQL
│   └── fase4.test.ts            # Tests de reglas de negocio (Fase 4): bulk, faltantes/repetidas
├── docker-compose.yml           # MySQL 8.4 para desarrollo
├── .env.example                 # Plantilla de configuración local
├── README.md                    # Este archivo
└── AGENT.md

Pendiente de fases siguientes: `src/lib/upload.ts` (Fase 5, fotos).
