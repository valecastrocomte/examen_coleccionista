# API — Documentación de Consumo

> **Estado:** ⏳ Pendiente — se completa en la Fase 6 del roadmap. Las peticiones se prueban contra la base de datos con Thunder Client/Postman y se registran en `docs/INFORME_PRUEBAS.md`.

## Contrato

- **Base URL:** `http://localhost:3000`
- **Formato:** `Content-Type: application/json` (excepto subida de foto: `multipart/form-data`).
- **Errores uniformes:** `{ "error": "mensaje", "detalles": [ { "campo": "nombre", "mensaje": "es obligatorio" } ] }`.

## Endpoints (resumen)

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| `GET` | `/api/albumes` | Listar álbumes con totales | 200 |
| `POST` | `/api/albumes` | Crear álbum | 201, 400 |
| `GET` | `/api/albumes/:id` | Detalle con láminas | 200, 404 |
| `PUT` | `/api/albumes/:id` | Actualizar álbum | 200, 400, 404 |
| `DELETE` | `/api/albumes/:id` | Eliminar álbum | 204, 404 |
| `GET` | `/api/albumes/:id/laminas` | Láminas del álbum | 200, 404 |
| `POST` | `/api/albumes/:id/laminas` | Agregar lámina | 201, 400, 404, 409 |
| `POST` | `/api/albumes/:id/laminas/bulk` | Carga masiva (transacción) | 201, 400, 404 |
| `GET` | `/api/albumes/:id/laminas/faltantes` | Faltantes (`cantidad = 0`) | 200, 404 |
| `GET` | `/api/albumes/:id/laminas/repetidas` | Repetidas + `cantidadRepetidas` | 200, 404 |
| `GET` | `/api/albumes/:id/estadisticas` | Totales y % completado | 200, 404 |
| `GET` | `/api/laminas/:id` | Detalle de lámina | 200, 404 |
| `PUT` | `/api/laminas/:id` | Actualizar lámina | 200, 400, 404, 409 |
| `PATCH` | `/api/laminas/:id` | Actualización parcial (ej. `cantidad`) | 200, 400, 404 |
| `DELETE` | `/api/laminas/:id` | Eliminar lámina | 204, 404 |
| `POST` | `/api/laminas/:id/foto` | Subir foto (`multipart`, campo `foto`) | 200, 400, 404 |
| `GET` | `/uploads/*` | Servir fotos subidas | 200, 404 |

> Este archivo es el resumen operativo. El detalle completo de Request/Response por endpoint está en el BRIEF §8; si hay diferencias, manda el BRIEF y actualiza este resumen en el mismo commit.