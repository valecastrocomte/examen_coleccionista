# BRIEF — Sistema de Gestión para Coleccionistas de Láminas de Álbumes

| Campo | Valor |
|---|---|
| **Proyecto** | Sistema de gestión para coleccionistas de láminas de álbumes |
| **Modalidad** | Proyecto final de curso |
| **Stack** | Hono + Prisma + TypeScript + MySQL (ver [stack.md](./stack.md)) |
| **Versión del brief** | 1.1 |
| **Fecha** | 2026-09-10 |
| **Última revisión** | 2026-09-10 — arquitectura MVC + Bootstrap |
| **Estado** | Aprobado para desarrollo |

---

## 1. Contexto

El curso solicita un sistema de gestión para coleccionistas de láminas de álbumes: crear álbumes, cargar sus láminas, marcar faltantes y repetidas, y exponer todo por API REST. El enunciado original indica Spring Boot, pero **el software resultante admite cambiar de stack**: se reemplaza Spring Boot + Maven por **Hono + Prisma + TypeScript**, conservando **MySQL** como base de datos. Este documento traduce los 4 bloques de requerimientos del enunciado al nuevo stack sin perder ningún requisito funcional.

La lógica de negocio del enunciado (CRUD de álbumes y láminas, carga masiva, listados de faltantes y repetidas, documentación y pruebas con screenshots) se cumple íntegramente.

La arquitectura es **MVC (Modelo–Vista–Controlador)**: los `models` (Prisma + Zod) gestionan datos y validación, los `controllers` resuelven cada petición y los `views` son plantillas HTML renderizadas en servidor con **Bootstrap 5** para la interfaz de usuario. La API REST del enunciado se mantiene bajo `/api/*` (JSON), servida por los mismos controllers y models.

---

## 2. Objetivos

1. Construir una API REST para gestionar álbumes y sus láminas, con operaciones CRUD completas.
2. Conectar la API a una base de datos **MySQL** mediante **Prisma** (schema-first, migraciones versionadas, queries tipadas).
3. Implementar la lógica de negocio: carga masiva de láminas, detección de **faltantes** y **repetidas** con cantidad de repetidas.
4. Permitir carga opcional de foto por lámina (subida multipart al servidor).
5. Documentar la API (Request/Response) y entregar un informe de pruebas con **screenshot por endpoint**.
6. Validar la entrada de datos (Zod) y responder errores con formato JSON uniforme.
7. Proveer una interfaz web **MVC con Bootstrap** (vistas HTML en servidor) que reutiliza los mismos models/controllers de la API.

---

## 3. Alcance

### Dentro del alcance
- API REST completa: álbumes y láminas (CRUD).
- Carga masiva de láminas en lote (bulk insert).
- Estado por lámina con detección de faltantes/repetidas y conteo de repetidas.
- Subida opcional de foto por lámina (y portada opcional del álbum).
- Migraciones de base de datos con Prisma, incluido un seed de datos de ejemplo.
- Documentación de la API y plan de pruebas con screenshots.
- Interfaz web MVC con vistas Bootstrap 5 (listados, formularios, detalle) servida por el mismo servidor.
- Tests automatizados base (Vitest) para la lógica de negocio del Bloque 3.

### Fuera del alcance (v1)
- Autenticación / roles de usuario (no lo pide el enunciado).
- Multiusuario y colecciones por usuario.
- Frontend SPA (React/Next.js) o app móvil separada (la interfaz es MVC server-side, no un frontend aparte).
- Almacenamiento de fotos en S3/cloud (se guardan en disco local).
- Despliegue a producción (entorno local de desarrollo).

---

## 4. Stack tecnológico

Resumen — detalle completo, versiones y justificación en [stack.md](./stack.md).

| Capa | Tecnología |
|---|---|
| Lenguaje | TypeScript (modo estricto) |
| Runtime | Node.js LTS |
| Framework web | Hono 4.13.x (server HTTP nativo de Node) |
| ORM | Prisma 7.x + connector MySQL |
| Base de datos | MySQL 8.x |
| Validación | Zod + `@hono/zod-validator` |
| Vistas (MVC) | EJS (plantillas HTML server-side) |
| UI / CSS | Bootstrap 5.3.x (assets locales en `public/vendor/bootstrap/`) |
| Tests | Vitest + helper de testing de Hono |
| Cliente HTTP (pruebas manuales) | Thunder Client (VS Code) o Postman |
| Paquetes | npm (opcional pnpm) |

---

## 5. Requerimientos funcionales

Mapa directo entre el enunciado del curso y los requerimientos del nuevo stack:

### Bloque 1 — Configuración del proyecto y conexión a la base de datos

| # | Requerimiento | Implementación |
|---|---|---|
| RF-1.1 | Inicializar un proyecto Spring Boot (configuración de proyecto) | Proyecto TypeScript inicializado con Hono; dependencias declaradas en `package.json` (equivalente al `pom.xml`) |
| RF-1.2 | Configurar la conexión a una base de datos MySQL | `DATABASE_URL` en `.env` con credenciales MySQL y Prisma Client conectado al arranque |
| RF-1.3 | Dependencias para JPA y MySQL | Sustituido por **Prisma** (`@prisma/client`, `prisma`, connector `mysql`) + `hono`, `@hono/node-server`, `zod`, `@hono/zod-validator`, `ejs`, `bootstrap` (lista completa en `stack.md` §3) |

**Criterio de aceptación:** `npm install` + `npx prisma migrate dev` crean las tablas en MySQL y `npm run dev` levanta la API respondiendo en `http://localhost:3000`.

### Bloque 2 — Modelo de datos y API REST

| # | Requerimiento | Implementación |
|---|---|---|
| RF-2.1 | Entidades de álbumes y láminas con los campos especificados (nombre, imagen, fecha de lanzamiento, tipo de láminas, etc.) | Modelos `Album` y `Lamina` en `prisma/schema.prisma` (ver §6) |
| RF-2.2 | CRUD de álbumes | API JSON: `GET/POST /api/albumes`, `GET/PUT/DELETE /api/albumes/:id` · Web MVC: `/albumes`, `/albumes/:id/...` (ver §8.3) |
| RF-2.3 | CRUD de láminas | API JSON: `GET/POST /api/albumes/:id/laminas`, `GET/PUT/DELETE /api/laminas/:id` · Web MVC: formularios en `/albumes/:id` (ver §8.3) |
| RF-2.4 | Carga opcional de una foto por lámina | `POST /api/laminas/:id/foto` (multipart/form-data), archivos en `uploads/`, URL servida por static files |

### Bloque 3 — Funcionalidades especiales para el manejo de láminas

| # | Requerimiento | Implementación |
|---|---|---|
| RF-3.1 | Gestionar el estado de cada lámina | Estado derivado de `cantidad`: `FALTANTE` (0), `UNICA` (1), `REPETIDA` (>1) — ver §7 |
| RF-3.2 | Ingresar un listado de láminas para facilitar la carga de datos | `POST /api/albumes/:id/laminas/bulk` acepta un array JSON y lo inserta **en una sola transacción** |
| RF-3.3 | Devolver listados de láminas faltantes y repetidas, **incluyendo la cantidad de repetidas por cada una** | `GET /api/albumes/:id/laminas/faltantes` y `GET /api/albumes/:id/laminas/repetidas` (con `cantidadRepetidas` por lámina) |

### Bloque 4 — Documentación y pruebas

| # | Requerimiento | Implementación |
|---|---|---|
| RF-4.1 | Documentación simple con Request, Response y datos necesarios para consumir la API | Sección §8 de este brief + `docs/API.md` con tabla de endpoints y ejemplos |
| RF-4.2 | Pruebas de todos los endpoints y de la lógica de negocio | Informe `docs/INFORME_PRUEBAS.md` con **screenshot de cada prueba** (Thunder Client/Postman) + tests Vitest del Bloque 3 |

---

## 6. Modelo de datos

```mermaid
erDiagram
    ALBUM ||--o{ LAMINA : contiene
    ALBUM {
        int id PK "autoincrement"
        string nombre
        string imagen "URL opcional (portada)"
        date fechaLanzamiento
        string tipoLaminas "categoría del álbum"
        string descripcion "opcional"
        datetime creadoEn
        datetime actualizadoEn
    }
    LAMINA {
        int id PK "autoincrement"
        int albumId FK "ON DELETE CASCADE"
        int numero "posición dentro del álbum"
        string nombre
        string tipo "enum rareza"
        string imagen "URL opcional (foto subida)"
        int cantidad "0 = faltante, 1 = única, >1 = repetida"
        datetime creadoEn
        datetime actualizadoEn
    }
```

### Tabla `Album`

| Campo | Tipo Prisma | MySQL | Nulo | Descripción |
|---|---|---|---|
| `id` | `Int @id @default(autoincrement())` | INT PK AUTO_INCREMENT | No | Identificador |
| `nombre` | `String` | VARCHAR(255) | No | Nombre del álbum |
| `imagen` | `String?` | VARCHAR(500) | Sí | URL de portada (opcional) |
| `fechaLanzamiento` | `DateTime @db.Date` | DATE | No | Fecha de lanzamiento |
| `tipoLaminas` | `String` | VARCHAR(100) | No | Tipo/categoría de láminas |
| `descripcion` | `String?` | TEXT | Sí | Descripción opcional |
| `creadoEn` / `actualizadoEn` | `DateTime @default(now())` / `@updatedAt` | DATETIME | No | Auditoría |

### Tabla `Lamina`

| Campo | Tipo Prisma | MySQL | Nulo | Descripción |
|---|---|---|---|
| `id` | `Int @id @default(autoincrement())` | INT PK AUTO_INCREMENT | No | Identificador |
| `albumId` | `Int` + FK | INT FK | No | Álbum al que pertenece; `onDelete: Cascade` |
| `numero` | `Int` | INT | No | Número de lámina dentro del álbum |
| `nombre` | `String` | VARCHAR(255) | No | Nombre de la lámina |
| `tipo` | `enum TipoLamina` | ENUM | No | Rareza: `COMUN, RARA, EPICA, LEGENDARIA` |
| `imagen` | `String?` | VARCHAR(500) | Sí | URL de la foto (si se cargó) |
| `cantidad` | `Int @default(0)` | INT default 0 | No | Copias en posesión del coleccionista |
| `creadoEn` / `actualizadoEn` | igual que `Album` | DATETIME | No | Auditoría |

**Índice único:** `@@unique([albumId, numero])` — una lámina no puede repetir su número dentro del mismo álbum.

---

## 7. Reglas de negocio

1. **Estado de una lámina** (derivado de `cantidad`, no se almacena):
   - `cantidad = 0` → **FALTANTE** (el coleccionista no la tiene).
   - `cantidad = 1` → **ÚNICA** (normal, no aparece en ningún listado especial).
   - `cantidad ≥ 2` → **REPETIDA**.
2. **Cantidad de repetidas:** `cantidadRepetidas = cantidad − 1` (copias extra por encima de la primera). Ej.: `cantidad = 3` ⇒ `cantidadRepetidas = 2`.
3. **Unicidad:** `(albumId, numero)` es único; insertar una lámina con número ya existente en el álbum devuelve `409 Conflict` con mensaje claro.
4. **Bulk insert transaccional:** si un elemento del lote falla la validación, **no se inserta ninguno** (rollback) y se devuelven los errores por índice (`prisma.$transaction`).
5. **Eliminación en cascada:** borrar un álbum elimina sus láminas.
6. **Actualización de `cantidad`:** vía `PATCH /api/laminas/:id` (ej. `{"cantidad": 2}`) — la suma/resta se valida para nunca quedar en negativo.
7. **Validación de entrada:** todos los body/query se validan con Zod antes de tocar la base de datos (RFC `400` con detalle).
8. **Fotos:** solo extensiones de imagen (`jpg`, `jpeg`, `png`, `webp`, `gif`), tamaño máximo 5 MB, nombre de archivo saneado.
9. **Las vistas web aplican las mismas reglas y validaciones que la API** (mismos models/controllers); los formularios muestran en pantalla los mismos errores de Zod.

---

## 8. API REST

Base URL: `http://localhost:3000` — formato de trabajo: `Content-Type: application/json` (excepto subida de foto: `multipart/form-data`). Prefijo `Accept-Version` no aplica en v1.

### 8.1 Endpoints

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| `GET` | `/api/albumes` | Listar álbumes (con totales: total/faltantes/repetidas) | 200 |
| `POST` | `/api/albumes` | Crear álbum | 201, 400 |
| `GET` | `/api/albumes/:id` | Detalle de álbum con sus láminas | 200, 404 |
| `PUT` | `/api/albumes/:id` | Actualizar álbum completo | 200, 400, 404 |
| `DELETE` | `/api/albumes/:id` | Eliminar álbum (cascada a láminas) | 204, 404 |
| `GET` | `/api/albumes/:id/laminas` | Listar láminas del álbum | 200, 404 |
| `POST` | `/api/albumes/:id/laminas` | Agregar una lámina | 201, 400, 404, 409 |
| `POST` | `/api/albumes/:id/laminas/bulk` | Cargar listado de láminas (transacción) | 201, 400, 404 |
| `GET` | `/api/albumes/:id/laminas/faltantes` | Láminas faltantes (`cantidad = 0`) | 200, 404 |
| `GET` | `/api/albumes/:id/laminas/repetidas` | Láminas repetidas con `cantidadRepetidas` | 200, 404 |
| `GET` | `/api/albumes/:id/estadisticas` | Totales del álbum (total, faltantes, repetidas, completado %) | 200, 404 |
| `GET` | `/api/laminas/:id` | Detalle de una lámina | 200, 404 |
| `PUT` | `/api/laminas/:id` | Actualizar lámina | 200, 400, 404, 409 |
| `PATCH` | `/api/laminas/:id` | Actualización parcial (ej. solo `cantidad`) | 200, 400, 404 |
| `DELETE` | `/api/laminas/:id` | Eliminar lámina | 204, 404 |
| `POST` | `/api/laminas/:id/foto` | Subir foto de la lámina (multipart, campo `foto`) | 200, 400, 404 |
| `GET` | `/uploads/*` | Servir archivos de imagen subidos | 200, 404 |

### 8.2 Ejemplos de Request / Response

**Crear álbum — `POST /api/albumes`**

Request:
```json
{
  "nombre": "Copa Mundial 2026",
  "imagen": "https://ejemplo.com/portada.png",
  "fechaLanzamiento": "2026-06-14",
  "tipoLaminas": "Fútbol",
  "descripcion": "Álbum oficial del Mundial"
}
```
Response `201 Created`:
```json
{
  "id": 1,
  "nombre": "Copa Mundial 2026",
  "imagen": "https://ejemplo.com/portada.png",
  "fechaLanzamiento": "2026-06-14",
  "tipoLaminas": "Fútbol",
  "descripcion": "Álbum oficial del Mundial",
  "totalLaminas": 0,
  "faltantes": 0,
  "repetidas": 0,
  "creadoEn": "2026-09-10T12:00:00.000Z",
  "actualizadoEn": "2026-09-10T12:00:00.000Z"
}
```

**Cargar listado de láminas — `POST /api/albumes/1/laminas/bulk`**

Request:
```json
[
  { "numero": 1, "nombre": "Lionel Messi", "tipo": "EPICA" },
  { "numero": 2, "nombre": "Diego Maradona", "tipo": "LEGENDARIA", "cantidad": 3 },
  { "numero": 3, "nombre": "A. Di María", "tipo": "RARA", "cantidad": 0 },
  { "numero": 4, "nombre": "E. Martínez", "tipo": "COMUN" }
]
```
Response `201 Created`:
```json
{
  "creadas": 4,
  "laminas": [ { "id": 1, "albumId": 1, "numero": 1, "nombre": "Lionel Messi", "tipo": "EPICA", "cantidad": 0 }, "…" ]
}
```
Si `numero = 2` ya existiera → `409 Conflict`:
```json
{ "error": "Ya existe una lámina con el número 2 en este álbum" }
```

**Láminas repetidas — `GET /api/albumes/1/laminas/repetidas`**

Response `200 OK`:
```json
{
  "albumId": 1,
  "totalRepetidas": 1,
  "repetidas": [
    { "id": 2, "numero": 2, "nombre": "Diego Maradona", "tipo": "LEGENDARIA", "cantidad": 3, "cantidadRepetidas": 2 }
  ]
}
```

**Láminas faltantes — `GET /api/albumes/1/laminas/faltantes`**

Response `200 OK`:
```json
{
  "albumId": 1,
  "totalFaltantes": 2,
  "faltantes": [
    { "id": 1, "numero": 1, "nombre": "Lionel Messi", "tipo": "EPICA", "cantidad": 0 },
    { "id": 3, "numero": 3, "nombre": "A. Di María", "tipo": "RARA", "cantidad": 0 }
  ]
}
```

**Subir foto — `POST /api/laminas/2/foto`** (body `multipart/form-data`, campo `foto` = archivo)
```json
Response 200 OK: { "id": 2, "imagen": "/uploads/laminas/2_1690000000.png" }
```

**Formato de error uniforme (400/404/409/500):**
```json
{ "error": "mensaje legible", "detalles": [ { "campo": "nombre", "mensaje": "es obligatorio" } ] }
```

### 8.3 Rutas web (interfaz MVC con Bootstrap)

Las vistas se renderizan con plantillas EJS + Bootstrap servidas por el mismo puerto, usando los mismos models/controllers que la API (responde `c.json` en `/api/*` y `c.html` en el resto). Los formularios usan **Post/Redirect/Get** para evitar reenvíos al refrescar.

| Método | Ruta | Vista (plantilla EJS) |
|---|---|---|
| `GET` | `/` | Redirige a `/albumes` |
| `GET` | `/albumes` | `albumes/listar.ejs` — tarjetas + tabla con totales (Bootstrap) |
| `GET` | `/albumes/nuevo` | `albumes/form.ejs` — formulario de alta |
| `POST` | `/albumes` | Crea y redirige a `/albumes/:id` |
| `GET` | `/albumes/:id` | `albumes/detalle.ejs` — álbum + láminas + badges faltantes/repetidas |
| `GET` / `POST` | `/albumes/:id/editar` | `albumes/form.ejs` — edición (PRG) |
| `POST` | `/albumes/:id/eliminar` | Elimina (POST, no GET) y redirige al listado |
| `GET` | `/albumes/:id/laminas/faltantes` | `laminas/faltantes.ejs` |
| `GET` | `/albumes/:id/laminas/repetidas` | `laminas/repetidas.ejs` |
| `POST` | `/albumes/:id/laminas` | Agrega lámina desde el detalle del álbum |
| `POST` | `/albumes/:id/laminas/bulk` | Carga masiva desde `textarea` JSON en la vista |
| `GET` / `POST` | `/laminas/:id/editar`, `POST /laminas/:id/eliminar` | `laminas/form.ejs` |
| `POST` | `/laminas/:id/foto` | Sube foto (misma lógica multipart que la API) |
| `GET` | `/public/*` | Bootstrap y assets (CSS/JS locales) |

---

## 9. Estructura del proyecto

```
examen_coleccionista/
├── docs/
│   ├── BRIEF.md              ← este documento
│   ├── stack.md              ← stack tecnológico
│   ├── API.md                ← documentación de consumo (RF-4.1)
│   └── INFORME_PRUEBAS.md    ← informe con screenshots (RF-4.2)
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── index.ts              ← arranque del servidor (Hono + node-server)
│   ├── app.ts                ← app: middleware, estáticos, rutas (importable en tests)
│   ├── db.ts                 ← instancia única de PrismaClient
│   ├── models/               ← MODELO: queries Prisma + esquemas Zod
│   │   ├── album.model.ts
│   │   └── lamina.model.ts
│   ├── controllers/          ← CONTROLADORES: lógica de cada petición (JSON y HTML)
│   │   ├── album.controller.ts   ← /api/albumes* y /albumes* (web)
│   │   └── lamina.controller.ts  ← /api/laminas* y /laminas* (web)
│   ├── views/                ← VISTAS: plantillas EJS + Bootstrap
│   │   ├── partials/         (header.ejs, nav.ejs, footer.ejs)
│   │   ├── albumes/          (listar.ejs, detalle.ejs, form.ejs)
│   │   └── laminas/          (form.ejs, faltantes.ejs, repetidas.ejs)
│   ├── public/
│   │   └── vendor/bootstrap/ (bootstrap.min.css, bootstrap.bundle.min.js)
│   └── lib/upload.ts         ← multipart + guardado de fotos en uploads/
├── tests/                    ← Vitest (Bloque 3)
├── uploads/                  ← fotos subidas (gitignored)
├── .env                      ← DATABASE_URL, PUERTO
├── package.json / tsconfig.json
└── README.md
```

Flujo MVC: el router de Hono mapea cada URL a un **controller**; los controllers usan los **models** (Prisma + Zod) y devuelven `c.html(plantilla EJS)` para la web o `c.json(...)` para la API. Las vistas NO consultan la base de datos.

---

## 10. Plan de pruebas y documentación (Bloque 4)

1. **Documentación de consumo** → `docs/API.md`: tabla con todos los métodos (método, ruta, body, códigos de respuesta esperados) + ejemplos listos para copiar en Thunder Client/Postman + `collections/thunder-collection.json` o `.http` (opcional).
2. **Pruebas manuales con screenshots** → recorrer TODOS los endpoints con Thunder Client (VS Code) o Postman y capturar **un screenshot por prueba**:
   - CRUD completo de un álbum (crear → listar → detalle → actualizar → eliminar).
   - CRUD completo de láminas.
   - Carga masiva (lote de 4+ láminas, caso de éxito y caso con duplicado → 409).
   - Faltantes y repetidas con datos preparados que cubran los tres estados (0, 1, ≥2 copias).
   - Subida de foto por lámina y acceso a `/uploads/...`.
   - Páginas web de la interfaz MVC: listado, detalle y formularios de álbum/lámina + listados de faltantes/repetidas con Bootstrap — screenshot por página en el informe.
   - Errores: 400 (validación), 404 (recurso inexistente), 409 (duplicado).
   - Cada screenshot anotado con método, ruta y resultado esperado vs obtenido → se vuelcan en `docs/INFORME_PRUEBAS.md`.
3. **Tests automatizados (Vitest)** sobre la lógica del Bloque 3: bulk transaccional, conteo de repetidas (`cantidad − 1`), filtros de faltantes/repetidas. Se ejecutan con `npm test` — no sustituyen los screenshots, los complementan.

---

## 11. Criterios de aceptación (checklist del enunciado)

| Bloque | Criterio | Cómo se verifica |
|---|---|---|
| 1 | Proyecto configurado y conectado a MySQL | `npm run dev` levanta API y web; `npx prisma studio` muestra las tablas con datos del seed |
| 1 | Dependencias declaradas (equivalente pom.xml → Prisma + MySQL) | `package.json` y `prisma/schema.prisma` con datasource `mysql` |
| 2 | Entidades `Album` y `Lamina` con campos del enunciado | Migración aplicada; `prisma/schema.prisma` documentado (§6) |
| 2 | CRUD álbumes y láminas funcional | Screenshots de API y vistas web (§10) |
| 2 | Foto opcional por lámina | Upload multipart verificado + imagen accesible por `/uploads/` |
| 3 | Carga por listado (bulk) | Screenshot del lote + test Vitest |
| 3 | Faltantes y repetidas con cantidad de repetidas | Screenshots + tests; `cantidadRepetidas = cantidad − 1` |
| 4 | Documentación de Request/Response | `docs/API.md` entregada |
| 4 | Pruebas de todos los endpoints documentadas | `docs/INFORME_PRUEBAS.md` con screenshot de cada prueba |
| 4 | Lógica de negocio respeta requisitos | Tests Vitest verdes (`npm test`) |

---

## 12. Entregables

1. Repositorio Git con el proyecto completo (API REST + web MVC + migraciones + seed).
2. `docs/BRIEF.md` y `docs/stack.md`. ✔ (este documento)
3. `docs/API.md` — documentación de consumo de la API.
4. `docs/INFORME_PRUEBAS.md` — informe con screenshots de todas las pruebas.
5. README con instrucciones de instalación y ejecución.

---

## 13. Cronograma sugerido

| Fase | Contenido | Esfuerzo (referencia) |
|---|---|---|
| 1. Setup | Proyecto Hono + TS, Prisma conectado a MySQL, migración inicial | 1 jornada |
| 2. Modelo + CRUD | `schema.prisma`, endpoints CRUD álbumes y láminas | 2 jornadas |
| 3. Negocio | Bulk transaccional, faltantes, repetidas, estadísticas | 1-2 jornadas |
| 4. Fotos | Upload multipart + static files | 1 jornada |
| 5. Documentación | `API.md` + pruebas con screenshots + informe | 2 jornadas |
| 6. Refinamiento | Tests Vitest, errores uniformes, revisión final | 1 jornada |

---

## 14. Configuración del entorno (para el informe)

```bash
# 1) Clonar e instalar
npm install

# 2) Configurar .env (ver .env.example)
#    DATABASE_URL="mysql://usuario:password@localhost:3306/examen_coleccionista"

# 3) Crear el esquema en MySQL y sembrar datos
npx prisma migrate dev --name init
npx prisma db seed

# 4) Ejecutar el servidor (API + web MVC)
npm run dev        # http://localhost:3000 · API: /api/albumes · Web: /albumes

# 5) Tests
npm test
```

---

## 15. Decisiones de diseño y supuestos

| # | Decisión | Detalle |
|---|---|---|
| D1 | Estado derivado de `cantidad` | No se guarda un campo `estado` que pueda desincronizarse; el enunciado pide "gestionar su estado" y los listados faltantes/repetidas se calculan de un solo campo, sin estados inconsistentes. |
| D2 | `cantidadRepetidas = cantidad − 1` | Convención explícita en §7 (la primera copia no es repetida). Se documenta en API.md para que la evaluación no tenga ambigüedad. |
| D3 | Bulk transaccional | O todo el lote entra o nada (evita álbumes a mitad de carga). |
| D4 | Fotos en disco local | Sin dependencias de cloud; `uploads/` se sirve estáticamente. Suficiente para el entorno del curso. |
| D5 | IDs autoincrementales | Más simples para un proyecto de curso que UUIDs; las claves foráneas y el índice único `(albumId, numero)` cubren la integridad. |
| D6 | `tipo` de lámina = rareza (`COMUN/RARA/EPICA/LEGENDARIA`) | Interpretación del "tipo de láminas"; se puede configurar en el enum sin tocar código (ver P2). |
| D7 | Zod para validación | Capa ligera y tipada sobre Hono; devuelve 400 con detalle por campo. |
| D8 | Arquitectura MVC | `models` (Prisma+Zod) → `controllers` → `views` (EJS+Bootstrap). API y web comparten models/controllers; cambia solo la respuesta (`c.json` vs `c.html`). |
| D9 | Bootstrap local (sin CDN) | Assets copiados en `public/vendor/bootstrap/`; funciona sin internet en evaluación y los screenshots son consistentes. |
| D10 | EJS renderizado a string | `ejs.renderFile(...)` → `c.html(...)`, sin middleware extra; compatible con cualquier runtime de Hono (Node/Bun). |
| D11 | Post/Redirect/Get en formularios | Evita reenvíos (duplicados) al refrescar; CSRF no aplica en v1 (sin autenticación ni cookies de sesión). |

---

## 16. Preguntas abiertas (para confirmar con el docente/comisión)

- **P1 — Entorno:** ¿se exige versiones puntuales de Node.js/MySQL en el entorno de evaluación? (Se asume Node.js LTS + MySQL 8.x.)
- **P2 — "Tipo de láminas":** ¿se refiere a rareza de la lámina (común/rara/épica/legendaria) o a categoría del álbum (fútbol, música…)? Se modelan ambas (`Album.tipoLaminas` y `Lamina.tipo`); confirmar valores esperados.
- **P3 — Fotografías:** ¿basta con guardar la foto en el servidor y exponer su URL por `/uploads/`? ¿Hay límite de tamaño o formato exigido?
- **P4 — Definición de "repetida":** ¿una lámina con 2 copias cuenta 1 o 2 repetidas? (Se asume `cantidad − 1` = 1.)
- **P5 — Credenciales MySQL:** ¿nombre de base de datos y credenciales concretas del entorno de evaluación, o se usa `.env` local con `examen_coleccionista`?
- **P6 — Informe:** ¿plantilla oficial para el informe de pruebas o formato libre en Markdown? (Se asume libre.)
- **P7 — Runtime:** ¿Node.js (asumido) o se prefiere Bun para ejecutar Hono? Ambos son soportados; el cambio no afecta al resto del stack.
- **P8 — Interfaz web:** ¿se evalúa la interfaz MVC (Bootstrap) además de la API REST, o basta la API del enunciado? (Se entregan ambas; la web reutiliza la misma lógica.)

---

*Fin del brief. Cualquier cambio de alcance o de estas decisiones debe actualizar este documento (versionado en §0).*