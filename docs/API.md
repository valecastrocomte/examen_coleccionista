# API — Documentación de Consumo

> **Estado:** ✅ Completada — Fase 6 del roadmap (2026-09-12). Esta guía describe el contrato **real** del código (`src/app.ts` + controllers + models); los ejemplos fueron verificados en vivo contra el servidor local.

## 1. Contrato general

| Aspecto | Valor |
|---|---|
| **Base URL** | `http://localhost:3000` |
| **Formato de trabajo** | `Content-Type: application/json` (salvo subida de foto: `multipart/form-data`) |
| **Autenticación** | No aplica en v1 (sin tokens ni sesiones) |
| **Fechas** | `fechaLanzamiento` se envía/recibe como `"YYYY-MM-DD"`; `creadoEn`/`actualizadoEn` en ISO 8601 UTC (`"2026-09-12T14:30:00.000Z"`) |
| **`tipo` de lámina** | Enum: `COMUN`, `RARA`, `EPICA`, `LEGENDARIA` |
| **Errores** | Formato uniforme `{ "error", "detalles" }` (ver §8) |
| **IDs** | Enteros positivos; un `:id` inválido devuelve `400` |

### Datos de referencia (seed)

El seed deja el álbum **1 "Copa Mundial 2026"** con 6 láminas (nums. 1–6) que cubren los tres estados:

| Nº | Lámina | `tipo` | `cantidad` | Estado |
|---|---|---|---|---|
| 1 | Lionel Messi | `EPICA` | 0 | Faltante |
| 2 | Diego Maradona | `LEGENDARIA` | 3 | Repetida (×2) |
| 3 | Ángel Di María | `RARA` | 1 | Única |
| 4 | Emiliano Martínez | `COMUN` | 2 | Repetida (×1) |
| 5 | Julián Álvarez | `COMUN` | 0 | Faltante |
| 6 | Kylian Mbappé | `EPICA` | 1 | Única |

Estadísticas del álbum 1: `totalLaminas=6`, `faltantes=2`, `repetidas=2`, `porcentajeCompletado=66.7`.

---

## 2. Resumen de endpoints

| # | Método | Ruta | Body | Respuestas |
|---|---|---|---|---|
| 1 | `GET` | `/api/albumes` | — | 200 |
| 2 | `POST` | `/api/albumes` | JSON álbum | 201, 400 |
| 3 | `GET` | `/api/albumes/:id` | — | 200, 400, 404 |
| 4 | `PUT` | `/api/albumes/:id` | JSON álbum completo | 200, 400, 404 |
| 5 | `DELETE` | `/api/albumes/:id` | — | 204, 400, 404 |
| 6 | `GET` | `/api/albumes/:id/laminas` | — | 200, 400, 404 |
| 7 | `POST` | `/api/albumes/:id/laminas` | JSON lámina | 201, 400, 404, 409 |
| 8 | `POST` | `/api/albumes/:id/laminas/bulk` | JSON array de láminas (transacción) | 201, 400, 404, 409 |
| 9 | `GET` | `/api/albumes/:id/laminas/faltantes` | — | 200, 400, 404 |
| 10 | `GET` | `/api/albumes/:id/laminas/repetidas` | — | 200, 400, 404 |
| 11 | `GET` | `/api/albumes/:id/estadisticas` | — | 200, 400, 404 |
| 12 | `GET` | `/api/laminas/:id` | — | 200, 400, 404 |
| 13 | `PUT` | `/api/laminas/:id` | JSON lámina completo | 200, 400, 404, 409 |
| 14 | `PATCH` | `/api/laminas/:id` | JSON parcial (≥ 1 campo) | 200, 400, 404, 409 |
| 15 | `DELETE` | `/api/laminas/:id` | — | 204, 400, 404 |
| 16 | `POST` | `/api/laminas/:id/foto` | `multipart/form-data` (campo `foto`) | 200, 400, 404 |
| 17 | `GET` | `/uploads/*` | — | 200, 404 |

### 2.1 Cómo usar estos ejemplos

- **Thunder Client / Postman:** método + `http://localhost:3000<ruta>`; en **Body → raw → JSON** pegar el bloque de Request; header `Content-Type: application/json` (lo setea el cliente al elegir JSON).
- La subida de foto se arma en **Body → form-data** con la clave `foto` (tipo *file*).
- Alternativa desde terminal: `curl` (ejemplos en cada sección).

---

## 3. Álбures

### 3.1 `GET /api/albumes` — Listar álbumes

Devuelve un array con todos los álbumes y sus totales derivados (no incluye las láminas).

**Respuesta `200 OK`:**
```json
[
  {
    "id": 1,
    "nombre": "Copa Mundial 2026",
    "imagen": "https://ejemplo.com/portada-mundial-2026.png",
    "fechaLanzamiento": "2026-06-14",
    "tipoLaminas": "Fútbol",
    "descripcion": "Álbum oficial del Mundial 2026: selecciones y figuras.",
    "totalLaminas": 6,
    "faltantes": 2,
    "repetidas": 2,
    "creadoEn": "2026-09-12T10:00:00.000Z",
    "actualizadoEn": "2026-09-12T10:00:00.000Z"
  }
]
```

```bash
curl -s http://localhost:3000/api/albumes
```

### 3.2 `POST /api/albumes` — Crear álbum

**Request (body JSON):**
```json
{
  "nombre": "Música 2025",
  "imagen": "https://ejemplo.com/portada-musica.png",
  "fechaLanzamiento": "2025-03-01",
  "tipoLaminas": "Música",
  "descripcion": "Álbum de artistas latinos"
}
```

Campos del body:

| Campo | Tipo | Regla |
|---|---|---|
| `nombre` | string | obligatorio, 1–255 |
| `imagen` | string \| null | opcional, máx. 500 |
| `fechaLanzamiento` | string | obligatorio, formato `YYYY-MM-DD` |
| `tipoLaminas` | string | obligatorio, 1–100 |
| `descripcion` | string \| null | opcional, máx. 65535 |

**Respuesta `201 Created`** — álbum serializado (como §3.1):
```json
{
  "id": 2,
  "nombre": "Música 2025",
  "imagen": "https://ejemplo.com/portada-musica.png",
  "fechaLanzamiento": "2025-03-01",
  "tipoLaminas": "Música",
  "descripcion": "Álbum de artistas latinos",
  "totalLaminas": 0,
  "faltantes": 0,
  "repetidas": 0,
  "creadoEn": "2026-09-12T11:00:00.000Z",
  "actualizadoEn": "2026-09-12T11:00:00.000Z"
}
```

**Errores:** `400` si el JSON es inválido o algún campo no cumple la regla (ver §8.1) — nada se inserta.

```bash
curl -s -X POST http://localhost:3000/api/albumes \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Música 2025","fechaLanzamiento":"2025-03-01","tipoLaminas":"Música"}'
```

### 3.3 `GET /api/albumes/:id` — Detalle de álbum

**Respuesta `200 OK`:** el álbum serializado con totales derivados. La lista de láminas se obtiene con `GET /api/albumes/:id/laminas` (§4.1).

**Errores:** `400` si `:id` no es entero positivo; `404` si el álbum no existe.

```bash
curl -s http://localhost:3000/api/albumes/1
```

### 3.4 `PUT /api/albumes/:id` — Actualizar álbum (completo)

Body: mismo esquema que `POST` (todos los campos, reemplaza por completo). **Respuesta `200 OK`** con el álbum actualizado.

**Errores:** `400` (validación), `404` (álbum inexistente).

```bash
curl -s -X PUT http://localhost:3000/api/albumes/2 \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Música 2025 (ed.)","imagen":null,"fechaLanzamiento":"2025-03-01","tipoLaminas":"Música","descripcion":"Editado"}'
```

### 3.5 `DELETE /api/albumes/:id` — Eliminar álbum

Elimina el álbum **y sus láminas en cascada** (FK `ON DELETE CASCADE`).

**Respuesta `204 No Content`** (sin cuerpo). **Errores:** `400` (`:id` inválido), `404` (inexistente).

```bash
curl -s -X DELETE -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/albumes/2
```

### 3.6 `GET /api/albumes/:id/estadisticas` — Totales y % completado

**Respuesta `200 OK`:**
```json
{
  "albumId": 1,
  "totalLaminas": 6,
  "faltantes": 2,
  "repetidas": 2,
  "porcentajeCompletado": 66.7
}
```

- `porcentajeCompletado = (total − faltantes) / total × 100`, con 1 decimal.
- Álbum vacío → `porcentajeCompletado: 100`.

**Errores:** `400`, `404`.

---

## 4. Láminas de un álbum

### 4.1 `GET /api/albumes/:id/laminas` — Láminas del álbum

**Respuesta `200 OK`** — array de láminas (ordenadas por `numero`):
```json
[
  { "id": 1, "albumId": 1, "numero": 1, "nombre": "Lionel Messi", "tipo": "EPICA", "imagen": null, "cantidad": 0,
    "creadoEn": "2026-09-12T10:00:00.000Z", "actualizadoEn": "2026-09-12T10:00:00.000Z" }
]
```

**Errores:** `400`, `404` (álbum inexistente).

### 4.2 `POST /api/albumes/:id/laminas` — Agregar lámina

**Request (body JSON):**
```json
{
  "numero": 7,
  "nombre": "Erling Haaland",
  "tipo": "RARA",
  "cantidad": 1
}
```

Campos del body:

| Campo | Tipo | Regla |
|---|---|---|
| `numero` | number | obligatorio, entero ≥ 1 |
| `nombre` | string | obligatorio, 1–255 |
| `tipo` | string | obligatorio: `COMUN` \| `RARA` \| `EPICA` \| `LEGENDARIA` |
| `imagen` | string \| null | opcional, máx. 500 |
| `cantidad` | number | opcional, entero ≥ 0 (default 0) |

**Respuesta `201 Created`** — lámina creada (formato §4.1).

**Errores:**
- `400` — validación del body o `:id` inválido.
- `404` — el álbum `:id` no existe.
- `409` — ya existe un `numero` igual en ese álbum; no se inserta nada:
  ```json
  { "error": "Ya existe una lámina con el número 7 en este álbum", "detalles": [] }
  ```

```bash
curl -s -X POST http://localhost:3000/api/albumes/1/laminas \
  -H "Content-Type: application/json" \
  -d '{"numero":7,"nombre":"Erling Haaland","tipo":"RARA","cantidad":1}'
```

### 4.3 `POST /api/albumes/:id/laminas/bulk` — Carga masiva (transaccional)

El body es **un array JSON**. La transacción es *todo o nada*: si un elemento falla la validación o un número está duplicado, **no se inserta ninguna** lámina.

**Request (body JSON):**
```json
[
  { "numero": 8, "nombre": "Vinicius Jr.", "tipo": "EPICA" },
  { "numero": 9, "nombre": "Jude Bellingham", "tipo": "RARA", "cantidad": 2 },
  { "numero": 10, "nombre": "Rodri Hernández", "tipo": "LEGENDARIA", "cantidad": 0 }
]
```

**Respuesta `201 Created`:**
```json
{
  "creadas": 3,
  "laminas": [
    { "id": 8, "albumId": 1, "numero": 8, "nombre": "Vinicius Jr.", "tipo": "EPICA", "imagen": null, "cantidad": 0,
      "creadoEn": "2026-09-12T12:00:00.000Z", "actualizadoEn": "2026-09-12T12:00:00.000Z" }
  ]
}
```

**Errores:**
- `400` — el body no es un array, o hay errores por índice (`lote[i].campo`, ver §8.2). Nada se inserta.
- `404` — álbum inexistente.
- `409` — un número ya existe en el álbum; **rollback de todo el lote**:
  ```json
  { "error": "Ya existe una lámina con ese número en este álbum; no se cargó ninguna", "detalles": [] }
  ```

```bash
curl -s -X POST http://localhost:3000/api/albumes/1/laminas/bulk \
  -H "Content-Type: application/json" \
  -d '[{"numero":8,"nombre":"Vinicius Jr.","tipo":"EPICA"},{"numero":9,"nombre":"Jude Bellingham","tipo":"RARA","cantidad":2}]'
```

### 4.4 `GET /api/albumes/:id/laminas/faltantes` — Faltantes

Láminas con `cantidad = 0` (el coleccionista no las tiene).

**Respuesta `200 OK`:**
```json
{
  "albumId": 1,
  "totalFaltantes": 2,
  "faltantes": [
    { "id": 1, "albumId": 1, "numero": 1, "nombre": "Lionel Messi", "tipo": "EPICA", "imagen": null, "cantidad": 0,
      "creadoEn": "2026-09-12T10:00:00.000Z", "actualizadoEn": "2026-09-12T10:00:00.000Z" },
    { "id": 5, "albumId": 1, "numero": 5, "nombre": "Julián Álvarez", "tipo": "COMUN", "imagen": null, "cantidad": 0,
      "creadoEn": "2026-09-12T10:00:00.000Z", "actualizadoEn": "2026-09-12T10:00:00.000Z" }
  ]
}
```

**Errores:** `400`, `404`.

### 4.5 `GET /api/albumes/:id/laminas/repetidas` — Repetidas

Láminas con `cantidad ≥ 2`, incluyendo `cantidadRepetidas = cantidad − 1` (la primera copia no es repetida; BRIEF §7.2).

**Respuesta `200 OK`:**
```json
{
  "albumId": 1,
  "totalRepetidas": 2,
  "repetidas": [
    { "id": 2, "albumId": 1, "numero": 2, "nombre": "Diego Maradona", "tipo": "LEGENDARIA", "imagen": null, "cantidad": 3,
      "creadoEn": "2026-09-12T10:00:00.000Z", "actualizadoEn": "2026-09-12T10:00:00.000Z", "cantidadRepetidas": 2 },
    { "id": 4, "albumId": 1, "numero": 4, "nombre": "Emiliano Martínez", "tipo": "COMUN", "imagen": null, "cantidad": 2,
      "creadoEn": "2026-09-12T10:00:00.000Z", "actualizadoEn": "2026-09-12T10:00:00.000Z", "cantidadRepetidas": 1 }
  ]
}
```

**Errores:** `400`, `404`.

---

## 5. Láminas (por id)

### 5.1 `GET /api/laminas/:id` — Detalle de lámina

**Respuesta `200 OK`:** lámina (formato §4.1). **Errores:** `400`, `404`.

### 5.2 `PUT /api/laminas/:id` — Actualizar lámina (completo)

Body: mismo esquema que `POST` §4.2 (reemplaza todos los campos; `cantidad` por defecto 0 si se omite).

**Respuesta `200 OK`:** lámina actualizada. **Errores:** `400`, `404`, `409` (si el nuevo `numero` choca con otra lámina del mismo álbum).

```bash
curl -s -X PUT http://localhost:3000/api/laminas/8 \
  -H "Content-Type: application/json" \
  -d '{"numero":8,"nombre":"Vinicius Jr.","tipo":"EPICA","cantidad":1}'
```

### 5.3 `PATCH /api/laminas/:id` — Actualización parcial

Actualiza **solo los campos presentes** (mínimo 1). Ej.: cambiar la cantidad sin tocar el resto.

**Request (body JSON):**
```json
{ "cantidad": 5 }
```

**Respuesta `200 OK`:** lámina con `cantidad: 5` actualizada.

**Errores:**
- `400` — body vacío (`{ "error": "Datos inválidos", "detalles": [ { "campo": "(cuerpo)", "mensaje": "no se envió ningún campo para actualizar" } ] }`), campo inválido, o `:id` inválido.
- `404` — lámina inexistente.
- `409` — si se cambia `numero` y ya existe otro igual en el álbum.

```bash
curl -s -X PATCH http://localhost:3000/api/laminas/8 \
  -H "Content-Type: application/json" \
  -d '{"cantidad":5}'
```

### 5.4 `DELETE /api/laminas/:id` — Eliminar lámina

**Respuesta `204 No Content`** (sin cuerpo). **Errores:** `400`, `404`.

### 5.5 `POST /api/laminas/:id/foto` — Subir foto

Body `multipart/form-data`, único campo **`foto`** = archivo. Validaciones (BRIEF §7.8): extensiones `jpg`, `jpeg`, `png`, `webp`, `gif`; tamaño máx. **5 MB**; archivo no vacío. El nombre se genera en el servidor (`uploads/laminas/<id>_<timestamp>.<ext>`) y queda en el campo `imagen`.

**Respuesta `200 OK`:**
```json
{ "id": 2, "imagen": "/uploads/laminas/2_1750000000000.png" }
```

**Errores `400`** (todos con `{ "error": "…", "detalles": [] }`):
| Caso | `error` |
|---|---|
| Content-Type no multipart | `La petición debe ser multipart/form-data con el campo 'foto'` |
| Campo `foto` ausente / no archivo | `El campo 'foto' debe ser un archivo de imagen` |
| Extensión no permitida | `Formato de imagen no permitido (jpg, jpeg, png, webp o gif)` |
| Archivo de 0 bytes | `El archivo está vacío (0 bytes)` |
| Mayor a 5 MB | `La imagen supera el tamaño máximo de 5 MB` |

**Errores:** `400` (lo anterior, o `:id` inválido), `404` (lámina inexistente).

```bash
curl -s -X POST http://localhost:3000/api/laminas/2/foto \
  -F "foto=@/ruta/a/mi-foto.png"
```

---

## 6. Archivos subidos

### 6.1 `GET /uploads/*` — Servir fotos

Cualquier URL `imagen` devuelta por la API (ej. `/uploads/laminas/2_1750000000000.png`) se sirve como archivo estático.

- **`200`** con el `Content-Type` del archivo.
- **`404`** si el archivo no existe.

---

## 7. Flujo completo de ejemplo (para replicar en 2 minutos)

1. `GET /api/albumes` → seed con el álbum 1.
2. `POST /api/albumes/1/laminas/bulk` con 3 láminas nuevas → `201` con `creadas: 3`.
3. `GET /api/albumes/1/laminas/faltantes` → las de `cantidad = 0`.
4. `PATCH /api/laminas/<id-de-una-faltante>` con `{ "cantidad": 1 }` → sale de faltantes.
5. `GET /api/albumes/1/estadisticas` → el `porcentajeCompletado` sube.
6. `POST /api/laminas/<id>/foto` con una imagen PNG → `200` y la URL en `imagen`.
7. `DELETE /api/albumes/<id-creado>` → `204` (cascada a sus láminas).

---

## 8. Formato de error y casos 400/404/409

### 8.1 Formato uniforme

Todo error JSON tiene la misma estructura (BRIEF §8.2):

```json
{
  "error": "mensaje legible",
  "detalles": [
    { "campo": "nombre", "mensaje": "es obligatorio" }
  ]
}
```

- `error`: resumen del problema (el usuario lo puede leer).
- `detalles`: errores por campo de la validación Zod; **vacío `[]`** en 404/409/500.

### 8.2 Casos por código

**`400` — petición mal formada o datos inválidos.** Nada se inserta/modifica.
- JSON inválido o ausente → `{ "error": "Cuerpo de la petición inválido: debe ser JSON", "detalles": [] }`.
- Validación de campos → `{ "error": "Datos inválidos", "detalles": [ …por campo… ] }`. Ej. POST álbum incompleto:
  ```json
  {
    "error": "Datos inválidos",
    "detalles": [
      { "campo": "nombre", "mensaje": "es obligatorio" },
      { "campo": "fechaLanzamiento", "mensaje": "es obligatorio" }
    ]
  }
  ```
- `:id` no entero positivo → `{ "error": "Datos inválidos", "detalles": [ { "campo": "id", "mensaje": "debe ser un entero positivo" } ] }`.
- Bulk con un lote inválido → errores **por índice** (`lote[i].campo`):
  ```json
  {
    "error": "Datos inválidos",
    "detalles": [
      { "campo": "lote[1].tipo", "mensaje": "tipo no válido (COMUN, RARA, EPICA, LEGENDARIA)" }
    ]
  }
  ```
- Bulk cuyo body no es array → `{ "error": "Datos inválidos", "detalles": [ { "campo": "lote", "mensaje": "el cuerpo debe ser un array JSON de láminas" } ] }`.
- Foto inválida → mensajes de §5.5.

**`404` — recurso inexistente.**
- Álbum: `{ "error": "Álbum no encontrado", "detalles": [] }`.
- Lámina: `{ "error": "Lámina no encontrada", "detalles": [] }`.
- Ruta `/api/*` desconocida: `{ "error": "Recurso no encontrado", "detalles": [] }`.

**`409` — conflicto de unicidad `(albumId, numero)`.**
- Alta/actualización de una lámina con número ya existente en el álbum:
  `{ "error": "Ya existe una lámina con el número 7 en este álbum", "detalles": [] }`
- Bulk con duplicado → rollback total: `{ "error": "Ya existe una lámina con ese número en este álbum; no se cargó ninguna", "detalles": [] }`.

**`500` — error interno.**
- `{ "error": "Error interno del servidor", "detalles": [] }` (el detalle queda en los logs del servidor).

---

## 9. Notas

- El "estado" de una lámina (Faltante/Única/Repetida) **no se almacena**: se deriva de `cantidad` (0, 1, ≥2) — D1 del BRIEF §15.
- `cantidadRepetidas = cantidad − 1` (D2): una lámina con 3 copias cuenta 2 repetidas.
- El detalle de álbum devuelve totales derivados; las láminas se consultan por `GET /api/albumes/:id/laminas`.
- Las rutas web MVC (`/albumes*`, sin prefijo `/api`) usan la misma lógica pero responden HTML; no forman parte de este contrato JSON.