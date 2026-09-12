# Roadmap de Implementación

Plan de fases del proyecto **Sistema de Gestión de Colecciones de Láminas** (Hono + Prisma + TypeScript + MySQL, arquitectura MVC, vistas Bootstrap oscuras).

- **Estado general:** 🟢 En desarrollo — Fases 0–5 completadas (servidor, modelo de datos, API REST, vistas web MVC, reglas de negocio y fotos de láminas); sigue Fase 6.
- **Fuente de requisitos:** [`docs/BRIEF.md`](docs/BRIEF.md) — ante cualquier duda, manda el BRIEF.

---

## Resumen de fases

| Fase | Nombre | Estado |
|---|---|---|
| 0 | Setup del proyecto y MySQL | ✅ Completada |
| 1 | Modelo de datos (Prisma) | ✅ Completada |
| 2 | API REST CRUD (álbumes y láminas) | ✅ Completada |
| 3 | Interfaces web MVC + Bootstrap | ✅ Completada |
| 4 | Reglas de negocio (bulk, faltantes, repetidas) | ✅ Completada |
| 5 | Fotos de láminas | ✅ Completada |
| 6 | Documentación de consumo (API.md) | ⬜ Pendiente |
| 7 | Pruebas + informe con screenshots | ⬜ Pendiente |
| 8 | Refinamiento final y entrega | ⬜ Pendiente |

---

## Fase 0 — Setup del proyecto y MySQL

**Objetivo:** servidor Hono en Node con TypeScript y conexión a MySQL vía Prisma.

- [x] Inicializar proyecto Node + TypeScript (tsconfig estricto, `tsx` para dev).
- [x] Instalar dependencias: `hono`, `@hono/node-server`, `prisma`, `@prisma/client`, `zod`, `ejs`, `bootstrap`, `vitest` (`@hono/zod-validator` se descartó en Fase 2; ver `stack.md` §8).
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

- [x] Definir `Album` (nombre, imagen, fechaLanzamiento, tipoLaminas, descripcion, auditoría).
- [x] Definir `Lamina` (albumId FK cascade, numero, nombre, tipo, cantidad, imagen) + `@@unique([albumId, numero])`.
- [x] Definir enum `TipoLamina` (COMUN, RARA, EPICA, LEGENDARIA).
- [x] `npx prisma migrate dev --name init`.
- [x] Seed `prisma/seed.ts` con 1 álbum y láminas que cubran los 3 estados (0, 1 y ≥2 copias).
- [x] `npx prisma db seed` y verificar en `prisma studio`.

**Cierre:** tablas creadas en MySQL y seed visible en `prisma studio`.
**Actualiza:** `README.md` (si cambian comandos) · `roadmap.md`.

> **Cierre verificado (2026-09-12):** migración `init` aplicada — tablas `Album` y `Lamina` con enum `TipoLamina`, FK `ON DELETE CASCADE` e índice único `(albumId, numero)`; seed con 1 álbum ("Copa Mundial 2026") y 6 láminas que cubren 0, 1, 2 y 3 copias. Verificado en `prisma studio` (tablas + filas) y con consultas Prisma: el duplicado de un número dentro del álbum se bloquea con P2002; `npm test` (3 smoke) y `npm run build` pasan.

---

## Fase 2 — API REST CRUD

**Objetivo:** endpoints JSON del BRIEF §8.1 con validación Zod.

- [x] `models/`: `album.model.ts` y `lamina.model.ts` (queries Prisma + esquemas Zod) + `parametros.ts`/`lib/validacion.ts`.
- [x] `controllers/`: `album.controller.ts` y `lamina.controller.ts`.
- [x] `src/app.ts`: rutas `/api/albumes*` y `/api/laminas*` (misma lógica que la web).
- [x] CRUD álbumes: `GET/POST /api/albumes`, `GET/PUT/DELETE /api/albumes/:id`.
- [x] CRUD láminas: `GET/POST /api/albumes/:id/laminas`, `GET/PUT/DELETE /api/laminas/:id`.
- [x] Errores JSON uniformes: `{ "error", "detalles" }` (400/404/409/500).
- [x] PATCH parcial de `cantidad` (sin permitir negativo).

**Cierre:** todos los endpoints responden según §8.2 con Thunder Client/Postman.
**Actualiza:** `README.md` · `roadmap.md`.

> **Cierre verificado (2026-09-12):** los 13 endpoints CRUD de álbumes y láminas responden los códigos de §8.2 (201/204/400 con detalle por campo/404/409) contra MySQL real: `npm test` = 19 tests (16 de API en `tests/api.test.ts` + 3 smoke) y `npm run build` pasan; recorrido manual con curl sobre `npm run dev`. Validación Zod en los controllers (`src/lib/validacion.ts`) con errores uniformes `{ "error", "detalles" }`; el middleware `@hono/zod-validator` se descartó por tipos incompatibles con handlers nombrados en Hono 4.13 (decisión en `docs/stack.md` §8).

---

## Fase 3 — Interfaces web MVC + Bootstrap

**Objetivo:** vistas EJS del BRIEF §8.3 con el tema oscuro de `style.md`.

- [x] Partiales: `header.ejs`, `nav.ejs`, `footer.ejs` (con `data-bs-theme="dark"` y `app.css`).
- [x] Listado y detalle de álbumes (`albumes/listar.ejs`, `albumes/detalle.ejs`).
- [x] Formularios de álbum y lámina con PRG (`albumes/form.ejs`, `laminas/form.ejs`).
- [x] Listados de faltantes y repetidas (`laminas/faltantes.ejs`, `laminas/repetidas.ejs`).
- [x] Badges de estado y formulario de carga masiva (textarea JSON).
- [x] Cerrar el checklist de `style.md` §8 en cada vista.

**Cierre:** toda la web cumple `style.md` y comparte la lógica de la API.
**Actualiza:** `README.md` · `roadmap.md`.

> **Cierre verificado (2026-09-12):** recorrido completo en navegador (listado con tarjetas+tabla, detalle con badges Faltante/Única/Repetida ×N, alta/edición de álbum y lámina con PRG y mensajes `?ok=`, faltantes/repetidas con `cantidadRepetidas = cantidad − 1`, carga masiva por textarea con éxito y con duplicado → aviso "no se cargó ninguna" sin insertar). Tema oscuro de `style.md` implementado en `public/css/app.css` con `data-bs-theme="dark"`; `npm run build` y `npm test` (19) pasan; la API no cambió. La lógica derivada (estado, bulk transaccional) necesaria para las vistas se implementó ya en los models — los endpoints públicos `/api/.../bulk`, `/api/.../faltantes` y `/api/.../repetidas` quedan para la Fase 4.

---

## Fase 4 — Reglas de negocio

**Objetivo:** cumplir el BRIEF §7/§3 (estados, bulk, faltantes, repetidas).

- [x] Estado derivado de `cantidad` (0/1/≥2) en models y vistas.
- [x] `POST /api/albumes/:id/laminas/bulk` transaccional (todo o nada), 409 en duplicado.
- [x] `GET /api/albumes/:id/laminas/faltantes` y `.../repetidas` con `cantidadRepetidas = cantidad − 1`.
- [x] Carga masiva desde la vista web (textarea JSON).
- [x] Tests Vitest: bulk transaccional, conteo de repetidas, filtros faltantes/repetidas.
- [x] `npm test` verde.

**Cierre:** tests verdes y comportamiento verificado manualmente en API y web.
**Actualiza:** `README.md` · `roadmap.md`.

> **Cierre verificado (2026-09-12):** endpoints `/api/albumes/:id/laminas/bulk`, `/faltantes` y `/repetidas` respondiendo contra MySQL real con los códigos del BRIEF §8.1 — 201 con `creadas`/`laminas`, 400 con errores por índice (`lote[i].campo`), 404 y 409 (duplicado → rollback total; ningún insert a medias) — y `cantidadRepetidas = cantidad − 1` en cada repetida. `npm test` = 28 tests (9 nuevos de Fase 4 + 19 previos) y `npm run build` pasan. Carga masiva web re-verificada sobre el servidor en vivo: el POST del textarea JSON redirige con `?ok=3 láminas cargadas correctamente` (303) y un lote con número duplicado avisa "no se cargó ninguna" sin insertar. La lógica (estado derivado, transacción, validación por lote) vivía en los models desde Fase 3; esta fase expuso los endpoints públicos y los tests del Bloque 3 (BRIEF §10.3).

---

## Fase 5 — Fotos de láminas

**Objetivo:** subida opcional de foto por lámina (BRIEF RF-2.4, regla 8).

- [x] `lib/upload.ts`: validar extensión (jpg/jpeg/png/webp/gif) y ≤ 5 MB.
- [x] `POST /api/laminas/:id/foto` (multipart) y formulario web equivalente.
- [x] Guardado en `uploads/` con nombre saneado y URL en el campo `imagen`.
- [x] `uploads/` en `.gitignore`.
- [x] `GET /api/albumes/:id/estadisticas` (BRIEF §8.1, fuera del checklist): total, faltantes, repetidas y % completado.

**Cierre:** foto subida por API y web accesible vía `/uploads/...`.

> **Cierre verificado (2026-09-12):** `POST /api/laminas/:id/foto` sube una imagen real por multipart y la sirve por `/uploads/laminas/<id>_<ts>.<ext>` (200 `image/png`); 400 para extensión no permitida, tamaño > 5 MB, campo `foto` ausente o body no multipart, y 404 si la lámina no existe. Web en `laminas/form.ejs` (modo editar) con PRG: éxito → `?ok=Foto subida correctamente`, error visible en el formulario; miniatura en `albumes/detalle.ejs`. `GET /api/albumes/:id/estadisticas` responde 200 con `{ albumId, totalLaminas, faltantes, repetidas, porcentajeCompletado }` (seed: 66.7 = (6−2)/6 con 1 decimal; álbum vacío = 100) y 404 si no existe. `npm test` = 38 tests (10 nuevos en `tests/fase5.test.ts`) y `npm run build` pasan.

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