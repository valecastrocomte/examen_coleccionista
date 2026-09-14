# INFORME — Sistema de Gestión de Colecciones de Láminas

> **Proyecto:** Examen final — Sistema de gestión para coleccionistas de láminas de álbumes
> **Stack:** TypeScript · Node.js · Hono · Prisma 7 · MySQL 8 · Zod · EJS · Bootstrap 5 · Vitest
> **Fecha del informe:** 2026-09-13
> **Estado:** Entregado — Fases 0 a 8 completadas (ver `docs/roadmap.md`)

---

## 1. Introducción del proyecto

El examen pide un **sistema de gestión para coleccionistas de láminas de álbumes**: el coleccionista debe poder crear álbumes, cargar sus láminas, marcar cuáles le faltan y cuáles tiene repetidas, subir fotos, y exponer toda la funcionalidad por una **API REST** que un cliente externo pueda consumir.

El enunciado original propone **Spring Boot + Maven + JPA**, pero permite cambiar de stack siempre que se conserve **MySQL** y toda la lógica funcional. Este proyecto reemplaza esa propuesta por un stack moderno y equivalente:

| Capa del enunciado | Implementación elegida |
|---|---|
| Spring Boot (framework web) | **Hono 4.13** + `@hono/node-server` |
| Maven (`pom.xml`) | **npm** (`package.json`) |
| Spring Data JPA (ORM) | **Prisma 7** (schema-first, migraciones versionadas, cliente tipado) |
| Bean Validation | **Zod** |
| Thymeleaf/JSP (vistas) | **EJS** + **Bootstrap 5.3** (tema oscuro) |
| JUnit | **Vitest** |

El resultado cumple íntegramente los 4 bloques de requerimientos del enunciado: (1) configuración del proyecto y conexión a MySQL, (2) modelo de datos y API REST con CRUD completo, (3) funcionalidades especiales de láminas (carga masiva, faltantes y repetidas), y (4) documentación de la API y pruebas con evidencias.

---

## 2. Descripción General del Sistema

El sistema es una **aplicación web con arquitectura MVC** que ofrece dos caras del mismo dominio:

1. **API REST (JSON)** bajo el prefijo `/api/*` — 17 endpoints para consumir desde Thunder Client, Postman, curl o cualquier cliente HTTP.
2. **Interfaz web (HTML)** bajo `/albumes*` — vistas renderizadas en servidor con EJS + Bootstrap 5.3 en tema oscuro, que **reutilizan los mismos models y controllers** de la API (mismas reglas, mismas validaciones, mismos errores).

### Funcionalidades principales

- **CRUD de álbumes:** crear, listar, ver detalle, actualizar y eliminar (la eliminación borra sus láminas en cascada).
- **CRUD de láminas:** agregar, detalle, actualización completa (`PUT`), parcial (`PATCH`, p. ej. cambiar solo `cantidad`) y eliminar.
- **Carga masiva transaccional:** `POST /api/albumes/:id/laminas/bulk` inserta un listado completo en una sola transacción (todo o nada).
- **Estados derivados:** cada lámina se clasifica según su `cantidad` como **Faltante** (0), **Única** (1) o **Repetida** (≥2), con `cantidadRepetidas = cantidad − 1` (la primera copia no es repetida).
- **Listados especiales:** endpoint y vista web de láminas **faltantes** y **repetidas**, y **estadísticas** del álbum (totales y % de completado).
- **Subida de fotos:** una foto opcional por lámina (`multipart/form-data`), validada (extensiones `jpg/jpeg/png/webp/gif`, máx. 5 MB) y servida desde `/uploads/*`.
- **Validación en la entrada:** todo body, query y parámetro de ruta pasa por esquemas **Zod** antes de tocar la base de datos; los errores responden con formato JSON uniforme.

**Datos de referencia (seed):** el seed carga el álbum **"Copa Mundial 2026"** con 6 láminas que cubren los tres estados (cantidades 0, 1, 2 y 3), de modo que cualquier prueba puede validar faltantes, repetidas y estadísticas sin preparar datos.

---

## 3. Configuración del Proyecto y Conexión a Base de Datos

### 3.1 Inicialización del proyecto

El proyecto es TypeScript con módulos ESM (`"type": "module"`), compilación estricta (`tsc`) y ejecución en desarrollo con `tsx watch`. Las dependencias se declaran en `package.json`:

| Paquete | Rol |
|---|---|
| `hono` / `@hono/node-server` | Framework web y servidor HTTP |
| `@prisma/client` / `prisma` / `@prisma/adapter-mariadb` | ORM, CLI y adapter de conexión MySQL |
| `zod` | Validación de entrada |
| `ejs` / `bootstrap` | Vistas MVC y estilos |
| `vitest` / `tsx` / `typescript` | Tests, dev server y compilador |

### 3.2 Conexión a MySQL

La configuración sigue el patrón de 12-factor: **credenciales por variables de entorno**, nunca versionadas.

```env
# .env (copiado de .env.example — .env está en .gitignore)
DATABASE_URL="mysql://root:root@localhost:3306/examen_coleccionista?allowPublicKeyRetrieval=true"
PUERTO=3000
```

- `docker-compose.yml` levanta **MySQL 8.4** en `localhost:3306` con las credenciales del `.env.example` (usuario `root`, password `root`, base `examen_coleccionista`), con volumen persistente y healthcheck.
- `prisma7.config.ts` centraliza la configuración de Prisma 7: URL del datasource desde `process.env.DATABASE_URL`, carpeta de migraciones `prisma/migrations` y script de seed.
- `src/db.ts` crea la **instancia única** de `PrismaClient` usando el adapter `PrismaMariaDb` (driver compatible con el protocolo de MySQL 8, obligatorio en Prisma 7). Si falta `DATABASE_URL`, el arranque falla con un mensaje claro:

```ts
// src/db.ts (resumido)
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client.js";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
export const db = new PrismaClient({ adapter });
```

### 3.3 Pasos de configuración

```bash
docker compose up -d        # 1) MySQL 8.4 en localhost:3306
npm install                 # 2) dependencias (+ copia Bootstrap a public/vendor/)
# 3) crear .env desde .env.example
npx prisma migrate dev --name init   # 4) tablas en MySQL
npx prisma db seed                    # 5) datos de ejemplo
npm run dev                # 6) servidor en http://localhost:3000
```

**Verificación realizada (2026-09-13):** `npx prisma migrate status` confirma "Database schema is up to date", el seed se aplicó, `npm test` = **38/38 tests en verde** contra MySQL real y `npm run build` compila sin errores.

---

## 4. Diseño del Sistema y Modelo de Datos

### 4.1 Arquitectura MVC

```
Petición HTTP
      │
      ▼
┌───────────────────────── src/app.ts ─────────────────────────┐
│  App Hono: middleware de estáticos, rutas y errores          │
│  /api/*  → JSON    ·    /albumes*, /laminas*  → HTML (EJS)   │
└───────────────┬──────────────────────────┬───────────────────┘
                ▼                          ▼
        album.controller.ts          lamina.controller.ts
        (validan con Zod, deciden      (mismas reglas, cada uno
         la respuesta: JSON o HTML)    responde su capa)
                │                          │
                ▼                          ▼
        album.model.ts                lamina.model.ts
        (esquemas Zod + queries       (esquemas Zod + queries
         Prisma + serialización)       Prisma + reglas de negocio)
                └──────────────────────┬───────────────────────┘
                                       ▼
                              src/db.ts → Prisma Client
                                       ▼
                              MySQL 8 (examen_coleccionista)
```

- **Modelos** (`src/models/`): definen los esquemas Zod de entrada y todas las consultas Prisma. Son la única capa que toca la base de datos.
- **Controladores** (`src/controllers/`): resuelven cada petición — validan con `validarCuerpo`/`validarFormulario`/`validarParamId`, llaman a los models y responden JSON (API) o HTML (web MVC con patrón PRG).
- **Vistas** (`src/views/`, EJS + Bootstrap): parciales (`header`, `nav`, `footer`), listados, detalle y formularios, con tema oscuro en `public/css/app.css`.

### 4.2 Modelo de datos (Prisma, schema-first)

```mermaid
erDiagram
    ALBUM ||--o{ LAMINA : contiene
    ALBUM {
        int id PK "autoincrement"
        string nombre "VARCHAR(255), obligatorio"
        string imagen "VARCHAR(500), opcional (portada)"
        date fechaLanzamiento "YYYY-MM-DD"
        string tipoLaminas "VARCHAR(100), categoría"
        string descripcion "TEXT, opcional"
        datetime creadoEn "default now(), auditoría"
        datetime actualizadoEn "@updatedAt, auditoría"
    }
    LAMINA {
        int id PK "autoincrement"
        int albumId FK "ON DELETE CASCADE"
        int numero "posición en el álbum"
        string nombre "VARCHAR(255), obligatorio"
        enum tipo "COMUN | RARA | EPICA | LEGENDARIA"
        string imagen "VARCHAR(500), opcional (foto)"
        int cantidad "0=faltante 1=única >1=repetida"
        datetime creadoEn "auditoría"
        datetime actualizadoEn "auditoría"
    }
```

Detalles de diseño del esquema (`prisma/schema.prisma`):

- **`enum TipoLamina`** de MySQL: `COMUN`, `RARA`, `EPICA`, `LEGENDARIA`.
- **Índice único `@@unique([albumId, numero])`**: una lámina no puede repetir su número dentro del mismo álbum; la violación dispara en Prisma el error `P2002`, que los models convierten en **409 Conflict**.
- **FK `Lamina.albumId → Album.id` con `onDelete: Cascade`**: borrar un álbum elimina sus láminas (regla 5 del BRIEF).
- El estado de la lámina **no se almacena**: se deriva de `cantidad` en la capa de models (función `estadoLamina`), evitando estados inconsistentes.

### 4.3 Reglas de negocio clave

| # | Regla | Implementación |
|---|---|---|
| 1 | `cantidad = 0` → FALTANTE; `1` → ÚNICA; `≥2` → REPETIDA | `estadoLamina()` en `lamina.model.ts` |
| 2 | `cantidadRepetidas = cantidad − 1` (Maradona 3 → ×2) | `listarRepetidas()` calcula `cantidad - 1` por lámina |
| 3 | `(albumId, numero)` único → 409 con mensaje claro | catch de `P2002` en models → `ErrorNegocio(409)` |
| 4 | Bulk **todo o nada** | validación previa de todo el lote + `prisma.$transaction` |
| 5 | Borrar álbum → cascada a láminas | FK `ON DELETE CASCADE` |
| 6 | `cantidad` nunca negativa | Zod: `.min(0, "no puede ser negativa")` |
| 7 | Toda entrada validada antes de la BD | `safeParse` de Zod en `src/lib/validacion.ts` → 400 por campo |
| 8 | Fotografías: `jpg/jpeg/png/webp/gif`, ≤ 5 MB, nombre saneado | `src/lib/upload.ts` |

---

## 5. Diagrama de Arquitectura y Flujo Operativo

### 5.1 Bloques de la aplicación

```mermaid
flowchart TB
    subgraph Cliente
        NAV[("Navegador / Thunder Client / Postman / curl")]
    end

    subgraph Servidor Node (Hono)
        APP["src/app.ts<br/>rutas · estáticos · onError"]
        API["API REST<br/>/api/* → JSON"]
        WEB["Web MVC<br/>/albumes*, /laminas* → HTML"]
        CTRL["Controllers<br/>validan con Zod"]
        MOD["Models<br/>Zod schemas + queries Prisma"]
        VISTAS["Views EJS + Bootstrap<br/>(tema oscuro)"]
        STAT["serveStatic<br/>/public/* · /uploads/*"]
    end

    subgraph Almacenamiento
        MYSQL[("MySQL 8<br/>Album · Lamina")]
        DISCO[("uploads/laminas/...<br/>fotos subidas")]
    end

    NAV --> APP
    APP --> API
    APP --> WEB
    API --> CTRL
    WEB --> CTRL
    CTRL --> MOD
    WEB --> VISTAS
    STAT --> DISCO
    MOD --> MYSQL
```

### 5.2 Flujo operativo — recorrido del coleccionista

```mermaid
sequenceDiagram
    participant C as Cliente (API o Web)
    participant A as App Hono (src/app.ts)
    participant V as Controller (validación Zod)
    participant M as Model (Prisma)
    participant D as MySQL

    Note over C,D: Alta de álbum con su listado de láminas
    C->>A: POST /api/albumes (JSON álbum)
    A->>V: albumCtrl.crear
    V->>V: validarCuerpo(albumEntradaSchema) → 400 si falla
    V->>M: crearAlbum(datos)
    M->>D: prisma.album.create
    D-->>M: álbum creado
    M-->>V: serializarAlbum (con totales)
    V-->>C: 201 Created (JSON) / 303 redirect (web)

    Note over C,D: Carga masiva de láminas (todo o nada)
    C->>A: POST /api/albumes/1/laminas/bulk (array JSON)
    A->>V: laminaCtrl.crearBulk
    V->>V: validarLoteLaminas → 400 con errores por índice
    V->>M: crearLaminasBulk (prisma.$transaction)
    alt Número duplicado (P2002)
        M-->>V: ErrorNegocio(409) → rollback total
        V-->>C: 409 Conflict { "error", "detalles" }
    else Lote válido
        D-->>M: todas las láminas insertadas
        V-->>C: 201 { "creadas": N, "laminas": [...] }
    end

    Note over C,D: Consulta de repetidas con cantidad
    C->>A: GET /api/albumes/1/laminas/repetidas
    A->>V: laminaCtrl.listarRepetidas
    V->>M: obtenerAlbum(id) (incluye laminas)
    V->>V: filtrar cantidad ≥ 2 y añadir cantidadRepetidas = cantidad − 1
    V-->>C: 200 { "totalRepetidas", "repetidas": [...] }
```

El **flujo de errores** es uniforme: cualquier fallo de validación, de negocio o interno termina en el `onError` de `src/app.ts`, que distingue `ErrorNegocio` (p. ej. 409), `HTTPException` (p. ej. 400 de Hono) y errores no controlados (500), siempre con el formato `{ "error", "detalles" }`.

---

## 6. Implementación de la API REST y Servicios

### 6.1 Patrón de los controllers

Cada handler sigue el mismo patrón defensivo:

1. **Validar el `:id`** de la ruta (`validarParamId` → 400 si no es entero positivo).
2. **Leer y validar el body** (`validarCuerpo` para JSON, `validarFormulario` para la web) → 400 con detalle por campo.
3. **Verificar existencia** del recurso padre → 404.
4. **Delegar al model** (queries Prisma parametrizadas, tipadas).
5. **Responder** en el formato de la capa: JSON con el código correcto (201/200/204) o redirect PRG en la web.

### 6.2 Manejo de errores uniforme

- `src/lib/errores.ts` define `errorJson()` (respuesta uniforme), `ErrorNegocio` (error de negocio con código HTTP, lanzado por los models) y `detallesDeErrorZod()` (convierte issues de Zod en `{ campo, mensaje }`).
- Casos cubiertos: **400** validación (por campo, `lote[i].campo` para bulk), **404** álbum/lámina inexistente, **409** duplicado `(albumId, numero)` (con rollback en bulk), **500** error interno sin filtrar detalles.

### 6.3 Servicios

| Servicio | Dónde vive | Responsabilidad |
|---|---|---|
| Validación | `src/lib/validacion.ts` | `validarCuerpo`, `validarFormulario`, `validarParamId` (safeParse de Zod) |
| Errores | `src/lib/errores.ts` | formato uniforme `{ error, detalles }` y errores de negocio |
| Subida de fotos | `src/lib/upload.ts` | validar tipo/tamaño, nombre generado en servidor (`<laminaId>_<timestamp>.<ext>`), escritura en `uploads/` |
| Vistas | `src/lib/vistas.ts` | `renderVista` = `ejs.renderFile` + `c.html()` |
| BD | `src/db.ts` | instancia única de `PrismaClient` con adapter MySQL |

### 6.4 Web MVC (PRG)

Las vistas siguen **Post/Redirect/Get**: los POST validan, escriben y redirigen con `303` a `?ok=mensaje`; si hay error de validación, re-renderizan el formulario con los errores de Zod en pantalla (sin perder lo escrito) — misma lógica y mismos mensajes que la API, porque comparten models y esquemas.

---

## 7. Integridad de Datos y Auditoría

### 7.1 Integridad a nivel de base de datos

| Mecanismo | Declarado en | Efecto |
|---|---|---|
| Claves primarias autoincrementales | `@id @default(autoincrement())` en ambos modelos | Identificación estable |
| Clave foránea con **cascada** | `Lamina.album FK onDelete: Cascade` | No quedan láminas huérfanas si se borra el álbum |
| Índice **único `(albumId, numero)`** | `@@unique([albumId, numero])` | Impide números duplicados dentro del álbum incluso ante escrituras concurrentes |
| Enum MySQL para `tipo` | `enum TipoLamina` | El SGBD rechaza valores fuera de los 4 tipos |
| Restricciones de nulabilidad y tipos | columnas `NOT NULL` / `VARCHAR` / `DATE` / `DATETIME(3)` | Datos mal formados no llegan a persistirse |

El error de unicidad de Prisma (`P2002`) se traduce en **409 Conflict** con mensaje orientado al usuario (`"Ya existe una lámina con el número N en este álbum"`), y en el bulk provoca **rollback de todo el lote** — nunca quedan inserciones parciales.

### 7.2 Transaccionalidad

- **Bulk (todo o nada):** `crearLaminasBulk()` valida el lote entero y luego ejecuta las inserciones dentro de `prisma.$transaction`. Si una falla (duplicado, error de BD), **ninguna** se inserta.
- La comprobación de duplicados corre dentro de la misma transacción, cerrando la ventana de carrera entre consulta e inserción.

### 7.3 Validación en capas

1. **Zod (capa de aplicación):** body, query y parámetros validados y normalizados antes de cualquier consulta — 400 con detalle por campo, sin llegar a la BD.
2. **Prisma Client tipado:** las queries se generan desde el esquema; no hay concatenación de SQL (sin inyección posible).
3. **MySQL:** constraints (`NOT NULL`, FK, UNIQUE, ENUM) como última línea de defensa.

### 7.4 Auditoría

Ambos modelos llevan campos de auditoría automáticos:

| Campo | Regla Prisma | Uso |
|---|---|---|
| `creadoEn` | `@default(now())` | Cuándo se creó el registro |
| `actualizadoEn` | `@updatedAt` | Última modificación (lo actualiza Prisma en cada update) |

Con `migrations/` versionadas en el repositorio, cualquier cambio de esquema queda registrado y reproducible (la migración `init` crea las dos tablas y el FK en una operación).

---

## 8. Documentación de Endpoints y Evidencias de Pruebas

### 8.1 Resumen de endpoints (API REST, base `http://localhost:3000`)

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| `GET` | `/api/albumes` | Listar álbumes (con totales derivados) | 200 |
| `POST` | `/api/albumes` | Crear álbum | 201, 400 |
| `GET` | `/api/albumes/:id` | Detalle de álbum | 200, 400, 404 |
| `PUT` | `/api/albumes/:id` | Actualizar álbum completo | 200, 400, 404 |
| `DELETE` | `/api/albumes/:id` | Eliminar álbum (cascada) | 204, 400, 404 |
| `GET` | `/api/albumes/:id/estadisticas` | Totales y % completado | 200, 400, 404 |
| `GET` | `/api/albumes/:id/laminas` | Láminas del álbum (por número) | 200, 400, 404 |
| `POST` | `/api/albumes/:id/laminas` | Agregar lámina | 201, 400, 404, 409 |
| `POST` | `/api/albumes/:id/laminas/bulk` | Carga masiva transaccional | 201, 400, 404, 409 |
| `GET` | `/api/albumes/:id/laminas/faltantes` | Faltantes (`cantidad = 0`) | 200, 400, 404 |
| `GET` | `/api/albumes/:id/laminas/repetidas` | Repetidas con `cantidadRepetidas` | 200, 400, 404 |
| `GET` | `/api/laminas/:id` | Detalle de lámina | 200, 400, 404 |
| `PUT` | `/api/laminas/:id` | Actualizar lámina completa | 200, 400, 404, 409 |
| `PATCH` | `/api/laminas/:id` | Actualización parcial (≥1 campo) | 200, 400, 404, 409 |
| `DELETE` | `/api/laminas/:id` | Eliminar lámina | 204, 400, 404 |
| `POST` | `/api/laminas/:id/foto` | Subir foto (`multipart/form-data`, campo `foto`) | 200, 400, 404 |
| `GET` | `/uploads/*` | Servir fotos y estáticos | 200, 404 |

**Formato de error uniforme de toda la API:**
```json
{ "error": "…", "detalles": [ { "campo": "…", "mensaje": "…" } ] }
```

La guía completa de consumo con Request/Response copiables está en **`docs/API.md`** (17 endpoints + casos 400/404/409 + ejemplos curl).

### 8.2 Evidencias de pruebas automatizadas (ejecutadas el 2026-09-13)

Suite **Vitest** (`npm test`) ejecutada contra **MySQL real** (vía `app.request()`, la misma pila HTTP del servidor):

| Archivo de tests | Cubre |
|---|---|
| `tests/smoke.test.ts` | Fase 0: redirect `/` → `/albumes`, estáticos de Bootstrap, `/uploads` |
| `tests/api.test.ts` | Fase 2: CRUD de álbumes y láminas, validación 400, id inválido, 404 |
| `tests/fase4.test.ts` | Fase 4: bulk transaccional (todo o nada), duplicado 409, faltantes/repetidas con `cantidad − 1` |
| `tests/fase5.test.ts` | Fase 5: subida de foto (extensión, tamaño, 404) y estadísticas |

```text
$ npm test
 RUN  v5.0.0
 Test Files  4 passed (4)
      Tests  38 passed (38)
```

```text
$ npm run build
> tsc        → sin errores (compila dist/)
```

### 8.3 Evidencias de pruebas manuales (smoke test en vivo)

Servidor levantado (`npm run dev`) y endpoints verificados con `curl`:

| Petición | Respuesta |
|---|---|
| `GET /api/albumes` | `200` — array de álbumes con `totalLaminas`, `faltantes`, `repetidas` |
| `GET /api/albumes/1/estadisticas` | `200` — `{ albumId:1, totalLaminas:6, faltantes:2, repetidas:2, porcentajeCompletado:66.7 }` |
| `GET /api/albumes/1/laminas/repetidas` | `200` — `totalRepetidas:2`, con `cantidadRepetidas` (cantidad − 1) por lámina |
| `POST /api/albumes/1/laminas` (numero duplicado) | `409` — `{ "error": "Ya existe una lámina con el número 1 en este álbum", "detalles": [] }` |
| `GET /api/albumes/abc` (id no numérico) | `400` — `{ "error": "Datos inválidos", "detalles": [{ "campo": "id", ... }] }` |

### 8.4 Informe de pruebas con screenshots

El documento **`docs/INFORME_PRUEBAS.md`** (Fase 7 del roadmap) consolida **31 pruebas manuales** (26 de API + 5 vistas + 1 flujo web) recorriendo **todos** los endpoints, **con un screenshot por prueba** en `docs/screenshots/` (33 PNG), anotando método, URL, body, código y la comparación **esperado vs obtenido**:

| Bloque probado | Casos |
|---|---|
| CRUD álbumes y láminas | PR-01…04, 09, 16…18, 25, 26 (✔ 100 %) |
| Carga masiva (éxito y 409 rollback) | PR-11, PR-12 |
| Faltantes / repetidas / estadísticas | PR-13, PR-14, PR-15 (66.7 %) |
| Foto y `/uploads/...` | PR-21 (√) |
| Errores 400 / 404 / 409 | PR-05…07, 10, 19…20, 22…24 |
| Vistas web MVC | PR-27…31 (listado, detalle, formularios, faltantes/repetidas) |

**Resultado: 100 % de coincidencia esperado vs obtenido**, complementado por los 38 tests de Vitest.

---

## 9. Instrucciones de Despliegue y Ejecución

### 9.1 Requisitos previos

| Requisito | Versión |
|---|---|
| Node.js | LTS (v22 o superior) |
| MySQL | 8.x — o **Docker Desktop** para usar el `docker-compose.yml` incluido |
| npm | 11.x (incluido con Node) |

### 9.2 Puesta en marcha (desarrollo)

```bash
# 1) Levantar MySQL 8.4 (contenedor examen-mysql en localhost:3306)
docker compose up -d

# 2) Instalar dependencias (postinstall copia Bootstrap a public/vendor/)
npm install

# 3) Configurar entorno: copiar .env.example a .env (Windows: copy .env.example .env) y ajustar credenciales si hace falta

# 4) Crear el esquema y cargar datos de ejemplo
npx prisma migrate dev --name init
npx prisma db seed

# 5) Levantar el servidor (dev con recarga automática)
npm run dev
```

Abrir en el navegador:
- **Web (MVC):** http://localhost:3000/albumes
- **API REST:** http://localhost:3000/api/albumes

### 9.3 Producción / build

```bash
npm run build      # compila TypeScript → dist/
npm start          # ejecuta dist/index.js
```

### 9.4 Resumen de comandos útiles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor en modo desarrollo (recarga automática) |
| `npm run build` / `npm start` | Compilar / ejecutar producción |
| `npm test` | Suite Vitest (38 tests) |
| `npm run bootstrap` | Recopiar Bootstrap desde `node_modules/` a `public/vendor/` |
| `npx prisma migrate dev` | Aplicar migraciones tras cambiar el esquema |
| `npx prisma db seed` | Cargar datos de ejemplo |
| `npx prisma studio` | Explorador visual de la base |
| `docker compose down` | Detener MySQL |

### 9.5 Notas operativas

- **Variables de entorno:** `.env` nunca se versiona; `DATABASE_URL` y `PUERTO` son las únicas variables requeridas.
- **Fotos:** se guardan en `uploads/` (en `.gitignore`), servidas estáticamente por `/uploads/*`; borrar esa carpeta no afecta al esquema.
- **Entorno de desarrollo:** el alcance v1 no incluye autenticación ni despliegue cloud (según `docs/BRIEF.md` §3).

---

## 10. Conclusión

El sistema cumple **íntegramente** los requerimientos del examen:

1. **Configuración y conexión a BD (Bloque 1):** proyecto TypeScript + Hono inicializado con dependencias declaradas en `package.json`, Prisma conectado a MySQL 8 mediante `DATABASE_URL` en `.env` y migraciones versionadas. ✅
2. **Modelo de datos y API REST (Bloque 2):** entidades `Album` y `Lamina` según el enunciado (nombre, imagen, fecha de lanzamiento, tipo de láminas, etc.), CRUD completo de ambas por API JSON y por interfaz web, y subida opcional de foto por lámina. ✅
3. **Funcionalidades especiales (Bloque 3):** estado derivado de `cantidad` (faltante/única/repetida), carga masiva transaccional todo-o-nada y listados de faltantes y repetidas **con la cantidad de repetidas** (`cantidad − 1`). ✅
4. **Documentación y pruebas (Bloque 4):** `docs/API.md` con Request/Response de los 17 endpoints y `docs/INFORME_PRUEBAS.md` con screenshot por prueba (31 pruebas, 100 % esperado = obtenido), más 38 tests automatizados que validan la lógica de negocio contra MySQL real. ✅

Las decisiones de diseño más relevantes: mantener **MySQL** como base de datos (requisito), adoptar **Prisma** por su modelo schema-first con migraciones y cliente tipado, validar **toda entrada con Zod** antes de tocar la BD, derivar el estado de las láminas en vez de almacenarlo (imposible que quede inconsistente), y servir la API y la web MVC desde el mismo servidor y los mismos models — lo que garantiza que **la interfaz web y la API jamás divergen en reglas** (mismos mensajes, mismos códigos).

Alcances fuera de v1 (según `docs/BRIEF.md` §3): autenticación/roles, multiusuario y almacenamiento cloud de fotos. Son extensiones naturales que el diseño por capas permite agregar sin reescribir la lógica de negocio.

**Verificaciones finales realizadas (2026-09-13):** migración aplicada y seed cargado en MySQL 8.4 · `npm test` = 38/38 ✔ · `npm run build` ✔ · smoke test en vivo de la API: 200 (listado, estadísticas 66.7, repetidas con `cantidadRepetidas`), 400 (id inválido) y 409 (número duplicado, sin inserción) ✔.