# Stack tecnológico — Sistema de Gestión de Colecciones de Láminas

> Documento de referencia del stack. Fecha: 2026-09-10. Las versiones indicadas son las estables al momento de redactar; se instala **siempre la última estable compatible** (pin mínimo indicado).

## 1. Resumen

| Capa | Elección | Versión (mínima) | Rol en el proyecto |
|---|---|---|---|
| Lenguaje | **TypeScript** | 5.x | Tipado estricto en todo el código (server, models, controllers, validadores) |
| Runtime | **Node.js** | 22 LTS | Ejecuta Hono y los scripts de Prisma |
| Framework web | **Hono** | 4.13.5 | Enrutado HTTP, middleware, parsing de body/archivos, servir estáticos |
| Server HTTP | **@hono/node-server** | 2.0.10 | Adapta la app Hono a HTTP/1.1 de Node |
| ORM | **Prisma** | 7.x | Schema-first, migraciones versionadas, cliente tipado, seed |
| Base de datos | **MySQL** | 8.x | Persistencia (requisito del enunciado) |
| Validación | **Zod** + **@hono/zod-validator** | ≥3.24 (o 4.x) / 0.7.x | Valida body/query/params antes de tocar la BD → 400 con detalle |
| Vistas (MVC) | **EJS** | 3.x | Plantillas HTML server-side: `ejs.renderFile(...)` → `c.html(...)` |
| UI / CSS | **Bootstrap** | 5.3.x | Estilos y componentes de las vistas; assets locales en `public/vendor/bootstrap/` |
| Tests | **Vitest** + helper `app.request()` de Hono | 3.x | Tests automatizados de la lógica de negocio (Bloque 3) |
| Cliente HTTP (pruebas manuales) | **Thunder Client** (VS Code) o **Postman** | — | Consumo manual de la API; screenshots para el informe |
| Gestor de paquetes | **npm** | 11.x | `package.json` como declaración de dependencias |
| Control de versiones | **Git** + GitHub | — | Historial y entregable |

## 2. Justificación de cada pieza

- **Hono** sustituye a Spring Web: framework minimalista sobre Web Standards, rápido, con routing por prefijo (`/api`), soporte nativo de `multipart/form-data` (necesario para fotos) y estáticos (`serveStatic`, para `public/` y `uploads/`). Corre sobre Node sin capas extra.
- **Prisma** sustituye a Spring Data JPA: modelo definido en `prisma/schema.prisma`, generación de migraciones con `prisma migrate dev`, cliente tipado (autocompletado y errores en compilación), soporte maduro de MySQL y seed con `prisma db seed`. La conexión se configura por `DATABASE_URL` en `.env`.
- **TypeScript estricto** sustituye a Java: contratos de datos explícitos; los modelos Zod generan los tipos y los validan en runtime.
- **Zod + @hono/zod-validator** aporta la validación de entrada (equivalente a Bean Validation): errores 400 por campo.
- **Vitest** cubre la lógica de negocio del Bloque 3 con tests rápidos que no requieren levantar el servidor.
- **EJS** implementa las **vistas** del MVC: plantillas simples renderizadas a string y devueltas con `c.html()`; no requiere middleware ni acopla Hono a un runtime concreto.
- **Bootstrap** aporta la capa de presentación (tablas, tarjetas, formularios, badges de faltantes/repetidas). Se sirve **local** desde `public/vendor/bootstrap/`, sin CDN.
- **MySQL** se conserva porque es requisito del enunciado; con Prisma solo cambia la cadena `DATABASE_URL` si se quisiera otro motor.

## 3. Bootstrap del proyecto

```bash
# 1) Proyecto base (Node + TS)
npm init -y
npm install hono @hono/node-server @prisma/client zod @hono/zod-validator ejs
npm install -D prisma typescript tsx @types/node vitest

# Vistas MVC: instalar Bootstrap y copiar dist/ a public/vendor/bootstrap/
npm install bootstrap
#   copiar node_modules/bootstrap/dist/css/bootstrap.min.css
#     y node_modules/bootstrap/dist/js/bootstrap.bundle.min.js
#     → public/vendor/bootstrap/

# 2) Prisma conectado a MySQL
npx prisma init --datasource-provider mysql
# .env → DATABASE_URL="mysql://usuario:password@localhost:3306/examen_coleccionista"
```

## 4. Modelo de datos (esquema Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

enum TipoLamina {
  COMUN
  RARA
  EPICA
  LEGENDARIA
}

model Album {
  id              Int       @id @default(autoincrement())
  nombre          String
  imagen          String?
  fechaLanzamiento DateTime  @db.Date
  tipoLaminas     String
  descripcion     String?
  laminas         Lamina[]
  creadoEn        DateTime  @default(now())
  actualizadoEn   DateTime  @updatedAt
}

model Lamina {
  id          Int        @id @default(autoincrement())
  album       Album      @relation(fields: [albumId], references: [id], onDelete: Cascade)
  albumId     Int
  numero      Int
  nombre      String
  tipo        TipoLamina
  imagen      String?
  cantidad    Int        @default(0)
  creadoEn    DateTime   @default(now())
  actualizadoEn DateTime @updatedAt

  @@unique([albumId, numero])
}
```

```bash
npx prisma migrate dev --name init   # crea/aplica la migración
npx prisma db seed                   # datos de ejemplo
npx prisma studio                    # inspección visual de las tablas
```

> Nota de versiones: Prisma 8 en preview renueva los paquetes de runtime; el flujo `schema.prisma → migrate → PrismaClient` se mantiene. Si al iniciar el curso Prisma 8 ya está estable y el tutor lo aprueba, el stack se mueve a él sin cambios de diseño.

## 5. Hitos de configuración (product config)

```
package.json:
  "scripts": {
    "dev":       "tsx watch src/index.ts",
    "build":     "tsc",
    "start":     "node dist/index.js",
    "test":      "vitest run",
    "bootstrap": "node scripts/copiar-bootstrap.mjs"
  }
  "prisma": { "seed": "tsx prisma/seed.ts" }
```

El script `bootstrap` copia `node_modules/bootstrap/dist/` a `public/vendor/bootstrap/` (ver §3). Hasta que exista, la copia se hace manual.

```ts
// src/db.ts — instancia única de PrismaClient
import { PrismaClient } from "@prisma/client";
export const db = new PrismaClient();
```
```ts
// src/app.ts — estáticos (Bootstrap y fotos) + patrón MVC (Model → View → Controller)
import { serveStatic } from '@hono/node-server/serve-static'

app.use('/public/*',  serveStatic({ root: './' }))   // sirve ./public/*   → Bootstrap
app.use('/uploads/*', serveStatic({ root: './' }))   // sirve ./uploads/*  → fotos

// controllers/album.controller.ts
import { renderFile } from 'ejs'

export const listarAlbumes = async (c) => {
  const albumes = await db.album.findMany({ include: { laminas: true } }) // MODEL
  const html = await renderFile('src/views/albumes/listar.ejs', { albumes }) // VIEW
  return c.html(html) // CONTROLLER → respuesta final
}
```

## 6. Seguridad y buenas prácticas

- `.env` con `DATABASE_URL` **nunca** se versiona; se entrega `.env.example`.
- `uploads/` en `.gitignore` (las fotos son datos locales).
- Pines mínimos por CVE conocidas: `hono >= 4.13.5` y `@hono/node-server >= 2.0.10` (vulnerabilidades de parsing/WebSocket corregidas).
- Validación Zod en **todas** las entradas; errores uniformes `{ "error": …, "detalles": […] }`.
- Consultas Prisma siempre parametrizadas (sin concatenar strings): el cliente tipado lo garantiza.

## 7. Comandos de uso diario

| Acción | Comando |
|---|---|
| Levantar la API (dev con recarga) | `npm run dev` |
| Aplicar migración tras cambiar el schema | `npx prisma migrate dev` |
| Regenerar el cliente tras cambios de schema | `npx prisma generate` |
| Tests automáticos | `npm test` |
| Compilar para producción | `npm run build && npm start` |
| Inspeccionar la BD | `npx prisma studio` |

## 8. Alternativas descartadas

| Alternativa | Por qué se descarta |
|---|---|
| Express / Fastify | Elegidos por inercia, pero sin tipado schema-first ni validación integrada; Hono ofrece lo mismo con mejor DX y soporte moderno de parsing |
| Spring Boot (enunciado original) | El software admite cambiar de stack; se sustituye por el stack Hono/Prisma manteniendo MySQL y toda la lógica funcional |
| Drizzle / TypeORM | Prisma ganó por madurez de migraciones y comunidad; suficiente para el alcance del curso |
| Storage en la nube (S3) | No aporta valor al entorno del curso; fotos en disco con static files |
| Handlebars / Pug | EJS es el estándar de facto del MVC server-side en Node y su sintaxis es la más parecida a JSP/Thymeleaf del curso |
| React / SPA separada | Añade un segundo proyecto sin valor evaluable; el alcance es MVC + Bootstrap servido por el mismo server |

---

*Cambios de stack o versiones deben actualizar este documento.*