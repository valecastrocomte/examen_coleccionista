# Roadmap de Implementación

Plan de fases del proyecto **Sistema de Gestión de Colecciones de Láminas** (Hono + Prisma + TypeScript + MySQL, arquitectura MVC, vistas Bootstrap oscuras).

- **Estado general:** 🟢 En desarrollo — Fase 0 completada (servidor Hono + MySQL vía Prisma operativos); sigue Fase 1.
- **Fuente de requisitos:** [`docs/BRIEF.md`](docs/BRIEF.md) — ante cualquier duda, manda el BRIEF.

---

## Resumen de fases

| Fase | Nombre | Estado |
|---|---|---|
| 0 | Setup del proyecto y MySQL | ✅ Completada |
| 1 | Modelo de datos (Prisma) | ⬜ Pendiente |
| 2 | API REST CRUD (álbumes y láminas) | ⬜ Pendiente |
| 3 | Interfaces web MVC + Bootstrap | ⬜ Pendiente |
| 4 | Reglas de negocio (bulk, faltantes, repetidas) | ⬜ Pendiente |
| 5 | Fotos de láminas | ⬜ Pendiente |
| 6 | Documentación de consumo (API.md) | ⬜ Pendiente |
| 7 | Pruebas + informe con screenshots | ⬜ Pendiente |
| 8 | Refinamiento final y entrega | ⬜ Pendiente |

---

## Fase 0 — Setup del proyecto y MySQL

**Objetivo:** servidor Hono en Node con TypeScript y conexión a MySQL vía Prisma.

- [x] Inicializar proyecto Node + TypeScript (tsconfig estricto, `tsx` para dev).
- [x] Instalar dependencias: `hono`, `@hono/node-server`, `prisma`, `@prisma/client`, `zod`, `@hono/zod-validator`, `ejs`, `bootstrap`, `vitest`.
- [x] `npx prisma init --datasource-provider mysql` y configurar `DATABASE_URL` en `.env`.
- [x] Copiar Bootstrap `dist/` a `public/vendor/bootstrap/` (script `npm run bootstrap`).
- [x] Servir `/public/*` y `/uploads/*` con `serveStatic` de `@hono/node-server/serve-static`.
- [x] Levantar `npm run dev` y verificar `GET /` → redirige a `/albumes`.
**Cierre:** `npm run dev` levanta el servidor y Prisma conecta a MySQL sin errores.
**Actualiza:** `README.md` (comandos) · `roadmap.md` (marcar fase).

> **Cierre verificado (2026-09-10):** `npm run dev` y `npm start` levantan el servidor; `SELECT VERSION()` vía Prisma confirma MySQL 8.4.11 en `examen_coleccionista`; `npm test` (smoke) y `npm run build` pasan. MySQL corre con `docker compose up -d` (credenciales en `.env`); nota: Prisma 7 usa `prisma7.config.ts` y adapter `@prisma/adapter-mariadb`.

---

## Fase 1 — Modelo de datos (Prisma)

**Objetivo:** entidades `Album` y `Lamina` del BRIEF §6 con migración aplicada.

- [ ] Definir `Album` (nombre, imagen, fechaLanzamiento, tipoLaminas, descripcion, auditoría).
- [ ] Definir `Lamina` (albumId FK cascade, numero, nombre, tipo, cantidad, imagen) + `@@unique([albumId, numero])`.
- [ ] Definir enum `TipoLamina` (COMUN, RARA, EPICA, LEGENDARIA).
- [ ] `npx prisma migrate dev --name init`.
- [ ] Seed `prisma/seed.ts` con 1 álbum y láminas que cubran los 3 estados (0, 1 y ≥2 copias).
- [ ] `npx prisma db seed` y verificar en `prisma studio`.

**Cierre:** tablas creadas en MySQL y seed visible en `prisma studio`.
**Actualiza:** `README.md` (si cambian comandos) · `roadmap.md`.

---

## Fase 2 — API REST CRUD

**Objetivo:** endpoints JSON del BRIEF §8.1 con validación Zod.

- [ ] `models/`: `album.model.ts` y `lamina.model.ts` (queries Prisma + esquemas Zod).
- [ ] `controllers/`: `album.controller.ts` y `lamina.controller.ts`.
- [ ] `src/app.ts`: rutas `/api/albumes*` y `/api/laminas*` (misma lógica que la web).
- [ ] CRUD álbumes: `GET/POST /api/albumes`, `GET/PUT/DELETE /api/albumes/:id`.
- [ ] CRUD láminas: `GET/POST /api/albumes/:id/laminas`, `GET/PUT/DELETE /api/laminas/:id`.
- [ ] Errores JSON uniformes: `{ "error", "detalles" }` (400/404/409/500).
- [ ] PATCH parcial de `cantidad` (sin permitir negativo).

**Cierre:** todos los endpoints responden según §8.2 con Thunder Client/Postman.
**Actualiza:** `README.md` · `roadmap.md`.

---

## Fase 3 — Interfaces web MVC + Bootstrap

**Objetivo:** vistas EJS del BRIEF §8.3 con el tema oscuro de `style.md`.

- [ ] Partiales: `header.ejs`, `nav.ejs`, `footer.ejs` (con `data-bs-theme="dark"` y `app.css`).
- [ ] Listado y detalle de álbumes (`albumes/listar.ejs`, `albumes/detalle.ejs`).
- [ ] Formularios de álbum y lámina con PRG (`albumes/form.ejs`, `laminas/form.ejs`).
- [ ] Listados de faltantes y repetidas (`laminas/faltantes.ejs`, `laminas/repetidas.ejs`).
- [ ] Badges de estado y formulario de carga masiva (textarea JSON).
- [ ] Cerrar el checklist de `style.md` §8 en cada vista.

**Cierre:** toda la web cumple `style.md` y comparte la lógica de la API.
**Actualiza:** `README.md` · `roadmap.md`.

---

## Fase 4 — Reglas de negocio

**Objetivo:** cumplir el BRIEF §7/§3 (estados, bulk, faltantes, repetidas).

- [ ] Estado derivado de `cantidad` (0/1/≥2) en models y vistas.
- [ ] `POST /api/albumes/:id/laminas/bulk` transaccional (todo o nada), 409 en duplicado.
- [ ] `GET /api/albumes/:id/laminas/faltantes` y `.../repetidas` con `cantidadRepetidas = cantidad − 1`.
- [ ] Carga masiva desde la vista web (textarea JSON).
- [ ] Tests Vitest: bulk transaccional, conteo de repetidas, filtros faltantes/repetidas.
- [ ] `npm test` verde.

**Cierre:** tests verdes y comportamiento verificado manualmente en API y web.
**Actualiza:** `README.md` · `roadmap.md`.

---

## Fase 5 — Fotos de láminas

**Objetivo:** subida opcional de foto por lámina (BRIEF RF-2.4, regla 8).

- [ ] `lib/upload.ts`: validar extensión (jpg/jpeg/png/webp/gif) y ≤ 5 MB.
- [ ] `POST /api/laminas/:id/foto` (multipart) y formulario web equivalente.
- [ ] Guardado en `uploads/` con nombre saneado y URL en el campo `imagen`.
- [ ] `uploads/` en `.gitignore`.

**Cierre:** foto subida por API y web accesible vía `/uploads/...`.

---

## Fase 6 — Documentación de consumo (API.md)

**Objetivo:** cumplir RF-4.1 del BRIEF.

- [ ] Redactar `docs/API.md` con todos los métodos, Request/Response y códigos.
- [ ] Incluir ejemplos copiables para Thunder Client/Postman.
- [ ] Documentar el formato de error y los casos 400/404/409.

**Cierre:** cualquier persona replica todos los endpoints con solo leer `docs/API.md`.

---

## Fase 7 — Pruebas e informe con screenshots

**Objetivo:** cumplir RF-4.2 del BRIEF.

- [ ] Recorrer TODOS los endpoints de `docs/API.md` con Thunder Client/Postman.
- [ ] Capturar un screenshot por prueba (éxito y errores 400/404/409).
- [ ] Capturar screenshots de las vistas web (listado, detalle, formularios, faltantes/repetidas).
- [ ] Consolidar en `docs/INFORME_PRUEBAS.md` con resultado esperado vs obtenido.

**Cierre:** informe completo con screenshot por cada prueba.

---

## Fase 8 — Refinamiento final y entrega

**Objetivo:** checklist de aceptación del BRIEF §11 en verde.

- [ ] Verificar los criterios del BRIEF §11 uno a uno.
- [ ] Revisar `style.md` §8 en todas las vistas.
- [ ] Confirmar `README.md` con comandos vigentes y enlaces a `docs/`.
- [ ] Commit final y push del repositorio.

**Cierre:** todos los entregables del BRIEF §12 completos.

---

## Reglas de mantenimiento

1. **Un agente o colaborador que trabaje en este proyecto DEBE actualizar este archivo** al terminar cada fase: marcar checks y cambiar el estado del resumen.
2. Los criterios de cierre son obligatorios: no se marca una fase completa si su "Cierre" no se verificó.
3. Si una fase agrega o cambia comandos, `README.md` (Resumen de comandos) se actualiza en el mismo commit.
4. Ante conflictos con los requisitos, manda `docs/BRIEF.md`; ante dudas visuales, manda `style.md`.